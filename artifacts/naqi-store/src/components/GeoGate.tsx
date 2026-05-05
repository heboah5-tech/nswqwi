import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Globe2, ShieldAlert } from "lucide-react";

/**
 * Frontend half of the geo-firewall. Calls `/api/geo/check` once on
 * mount; if the server says the visitor's country is not allowed, the
 * entire app is replaced with a friendly Arabic block page instead of
 * the storefront. Network/parse errors fail OPEN (render children) so
 * a transient outage of api.country.is can't lock everyone out — the
 * server-side middleware is still the authoritative enforcement layer.
 *
 * The `/dashboard` route bypasses the gate entirely so the store
 * operator can keep managing orders while travelling.
 */

type GeoCheckResponse = {
  enabled: boolean;
  country: string;
  allowed: boolean;
  allowedCountry: string;
};

type GeoState =
  | { status: "loading" }
  | { status: "allowed" }
  | { status: "blocked"; country: string };

export default function GeoGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [state, setState] = useState<GeoState>({ status: "loading" });

  // Operator bypass — admin needs the dashboard reachable from anywhere.
  const bypass = location.startsWith("/dashboard");

  useEffect(() => {
    if (bypass) {
      setState({ status: "allowed" });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/geo/check", { cache: "no-store" });
        if (!r.ok) {
          if (!cancelled) setState({ status: "allowed" });
          return;
        }
        const body = (await r.json()) as GeoCheckResponse;
        if (cancelled) return;
        if (!body.enabled || body.allowed) {
          setState({ status: "allowed" });
        } else {
          setState({ status: "blocked", country: body.country });
        }
      } catch {
        // Fail open — server-side middleware is still the source of truth.
        if (!cancelled) setState({ status: "allowed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bypass]);

  if (state.status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (state.status === "blocked") {
    return <BlockedPage country={state.country} />;
  }

  return <>{children}</>;
}

function BlockedPage({ country }: { country: string }) {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/30 px-6 text-center"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-12 h-12 text-red-500" strokeWidth={1.8} />
        </div>
        <div className="absolute -bottom-1 -left-1 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center">
          <Globe2 className="w-5 h-5 text-blue-500" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
        الخدمة غير متاحة في منطقتك
      </h1>
      <p className="text-slate-600 max-w-md leading-relaxed mb-1">
        نعتذر، خدمة{" "}
        <span className="font-bold text-blue-600">نقي</span>{" "}
        متاحة حالياً فقط داخل
      </p>
      <p className="text-slate-900 font-extrabold text-lg mb-6 flex items-center gap-2">
        المملكة العربية السعودية
        <span aria-hidden="true">🇸🇦</span>
      </p>

      <div className="text-[11px] text-slate-400 font-mono mt-2" dir="ltr">
        Detected region: {country || "unknown"}
      </div>
    </div>
  );
}
