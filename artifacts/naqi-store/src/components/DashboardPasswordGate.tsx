import { useEffect, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import {
  clearStoredDashboardSecret,
  readStoredDashboardSecret,
  storeDashboardSecret,
  verifyDashboardSecret,
} from "@/lib/dashboardAuth";

type Status = "checking" | "locked" | "unlocked";

export default function DashboardPasswordGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const stored = readStoredDashboardSecret();
    if (!stored) {
      setStatus("locked");
      return;
    }
    (async () => {
      try {
        const ok = await verifyDashboardSecret(stored);
        if (cancelled) return;
        if (ok) {
          setStatus("unlocked");
        } else {
          clearStoredDashboardSecret();
          setStatus("locked");
        }
      } catch {
        if (cancelled) return;
        clearStoredDashboardSecret();
        setStatus("locked");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await verifyDashboardSecret(password);
      if (ok) {
        storeDashboardSecret(password);
        setPassword("");
        setStatus("unlocked");
      } else {
        setError("كلمة المرور غير صحيحة");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر التحقق من كلمة المرور");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "unlocked") {
    return <>{children}</>;
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-muted/30 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground mt-1">
            أدخل كلمة المرور المشتركة للمتابعة
          </p>
        </div>

        {status === "checking" ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              disabled={submitting}
              className="w-full bg-muted/50 border border-border focus:border-primary focus:bg-card rounded-lg px-3 py-2.5 text-sm outline-none transition-colors disabled:opacity-60"
            />
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !password.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg px-3 py-2.5 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "جاري التحقق..." : "فتح اللوحة"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
