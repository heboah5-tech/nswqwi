import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Geo-firewall middleware: restricts the storefront API to a single
 * allowed country (Saudi Arabia). The middleware is opt-in via the
 * `GEO_BLOCK_ENABLED` env var (default ON — set to "false" to disable
 * during local development from outside SA).
 *
 * Detection order, fastest first:
 *   1. Localhost / RFC1918 / link-local / ULA → "LOCAL" (always allowed
 *      so the dev workflow + screenshot tool keep working).
 *   2. Edge-injected country headers (Cloudflare, Vercel, generic) →
 *      authoritative when present.
 *   3. Fallback HTTP lookup against api.country.is (free, no API key,
 *      JSON `{ip, country}`), with a 1-hour in-memory LRU cache keyed
 *      by IP so we hit the network at most once per visitor per hour.
 *
 * Bypasses: any request carrying the `X-Dashboard-Secret` header is
 * passed through (dashboard operator may travel outside SA), as are
 * the health and geo-check endpoints themselves.
 */

const ALLOWED_COUNTRY = "SA";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_MAX = 5000;
const LOOKUP_TIMEOUT_MS = 2500;

type CacheEntry = { country: string; expiry: number };
const ipCache = new Map<string, CacheEntry>();

function isGeoBlockEnabled(): boolean {
  // Default ON — only disabled when env explicitly says "false"/"0"/"off".
  const v = (process.env["GEO_BLOCK_ENABLED"] ?? "true").toLowerCase();
  return v !== "false" && v !== "0" && v !== "off" && v !== "no";
}

function isLocalIp(ip: string): boolean {
  if (!ip) return true;
  const lower = ip.toLowerCase();
  if (
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower === "::ffff:127.0.0.1" ||
    lower === "0.0.0.0"
  ) {
    return true;
  }
  // strip IPv4-mapped IPv6 prefix
  const v4 = lower.startsWith("::ffff:") ? lower.slice(7) : lower;
  if (
    v4.startsWith("10.") ||
    v4.startsWith("192.168.") ||
    v4.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(v4) ||
    v4.startsWith("fc") ||
    v4.startsWith("fd")
  ) {
    return true;
  }
  return false;
}

function getClientIp(req: Request): string {
  // X-Forwarded-For may be a comma-separated chain — the leftmost IP is
  // the original client (per RFC 7239 convention used by most edges).
  const xff = req.header("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.header("x-real-ip");
  if (xri) return xri.trim();
  return req.ip || req.socket?.remoteAddress || "0.0.0.0";
}

function getCountryFromHeaders(req: Request): string | null {
  // Only trust headers that are injected (and overwritten on every
  // request) by a known edge provider. Generic `x-country` /
  // `x-geo-country` are intentionally NOT consulted because nothing
  // strips them on the way in, which would let a remote attacker
  // forge `x-country: SA` and bypass the firewall.
  const candidates = [
    req.header("cf-ipcountry"), // Cloudflare
    req.header("x-vercel-ip-country"), // Vercel
    req.header("x-nf-country"), // Netlify
    req.header("x-nf-geo"), // Netlify (alt)
  ];
  for (const c of candidates) {
    if (c && /^[A-Z]{2}$/i.test(c.trim())) {
      return c.trim().toUpperCase();
    }
  }
  return null;
}

function pruneCacheIfNeeded(): void {
  if (ipCache.size <= CACHE_MAX) return;
  // Drop the oldest ~10% of entries (Map preserves insertion order).
  const drop = Math.ceil(CACHE_MAX * 0.1);
  let i = 0;
  for (const key of ipCache.keys()) {
    if (i++ >= drop) break;
    ipCache.delete(key);
  }
}

async function lookupCountryByIp(ip: string): Promise<string> {
  if (isLocalIp(ip)) return "LOCAL";

  const cached = ipCache.get(ip);
  if (cached && cached.expiry > Date.now()) return cached.country;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), LOOKUP_TIMEOUT_MS);
    const r = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    clearTimeout(timer);
    if (!r.ok) return "??";
    const body = (await r.json()) as { country?: string };
    const country = (body?.country || "").toUpperCase() || "??";
    ipCache.set(ip, { country, expiry: Date.now() + CACHE_TTL_MS });
    pruneCacheIfNeeded();
    return country;
  } catch (err) {
    logger.warn({ err, ip }, "Geo IP lookup failed");
    return "??";
  }
}

/**
 * Resolve the request's country code. Used by both the block middleware
 * and the public `/geo/check` endpoint so they always agree.
 */
export async function detectCountry(
  req: Request,
): Promise<{ country: string; ip: string; source: "header" | "lookup" | "local" }> {
  const ip = getClientIp(req);
  if (isLocalIp(ip)) return { country: "LOCAL", ip, source: "local" };
  const headerCountry = getCountryFromHeaders(req);
  if (headerCountry) return { country: headerCountry, ip, source: "header" };
  const country = await lookupCountryByIp(ip);
  return { country, ip, source: "lookup" };
}

export function isAllowedCountry(country: string): boolean {
  // "??" = lookup unavailable. We FAIL OPEN here so a transient outage
  // of the geo-IP provider can't lock out real SA visitors. An
  // explicit non-SA result from a trusted edge header still blocks.
  return (
    country === "LOCAL" || country === "??" || country === ALLOWED_COUNTRY
  );
}

export function geoBlockMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isGeoBlockEnabled()) return next();

    // Operator dashboard requests carry the dashboard secret header —
    // we let them through unconditionally so the store owner can manage
    // orders from anywhere. The downstream `requireDashboardSecret`
    // middleware still validates the actual secret.
    if (req.header("x-dashboard-secret")) return next();

    // Skip the geo-check endpoint, the health probe, AND the dashboard
    // unlock endpoint — the operator obviously cannot present
    // X-Dashboard-Secret before they've authenticated, so blocking
    // /admin/dashboard/verify from abroad would soft-lock them out of
    // their own store.
    const p = req.path;
    if (
      p === "/healthz" ||
      p.startsWith("/geo") ||
      p === "/admin/dashboard/verify"
    ) {
      return next();
    }

    const { country, ip } = await detectCountry(req);
    if (isAllowedCountry(country)) return next();

    logger.info(
      { ip, country, path: req.originalUrl, method: req.method },
      "Geo-blocked request",
    );
    res.status(403).json({
      error: "geo_blocked",
      country,
      message:
        "هذه الخدمة متاحة فقط داخل المملكة العربية السعودية.",
      message_en: "This service is only available in Saudi Arabia.",
    });
  };
}

export const GEO_ALLOWED_COUNTRY = ALLOWED_COUNTRY;
export { isGeoBlockEnabled };
