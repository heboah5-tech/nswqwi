import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const DASHBOARD_SECRET_HEADER = "x-dashboard-secret";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function getDashboardSecret(): string | undefined {
  const v = process.env["DASHBOARD_SECRET"];
  return v && v.length > 0 ? v : undefined;
}

export function verifyDashboardSecret(candidate: string | undefined): boolean {
  const expected = getDashboardSecret();
  if (!expected) return false;
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  return timingSafeEqual(candidate, expected);
}

export function requireDashboardSecret(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const expected = getDashboardSecret();
  if (!expected) {
    logger.error(
      "DASHBOARD_SECRET is not configured; refusing dashboard write request",
    );
    res.status(503).json({
      error: "Dashboard is not configured (missing DASHBOARD_SECRET).",
    });
    return;
  }
  const provided = req.header(DASHBOARD_SECRET_HEADER);
  if (!verifyDashboardSecret(provided)) {
    res.status(401).json({ error: "Invalid or missing dashboard password." });
    return;
  }
  next();
}
