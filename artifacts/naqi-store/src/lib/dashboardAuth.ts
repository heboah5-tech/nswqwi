const STORAGE_KEY = "naqi.dashboardSecret.v1";
export const DASHBOARD_SECRET_HEADER = "X-Dashboard-Secret";

export function readStoredDashboardSecret(): string | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function storeDashboardSecret(secret: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, secret);
  } catch {
    /* ignore quota / private mode errors */
  }
}

export function clearStoredDashboardSecret(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function dashboardSecretHeaders(): Record<string, string> {
  const v = readStoredDashboardSecret();
  return v ? { [DASHBOARD_SECRET_HEADER]: v } : {};
}

/**
 * Verify a candidate password against the api-server. Returns true on 200,
 * false on 401, throws on network / 5xx so the caller can surface the error.
 */
export async function verifyDashboardSecret(secret: string): Promise<boolean> {
  const r = await fetch("/api/admin/dashboard/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  });
  if (r.status === 200) return true;
  if (r.status === 401) return false;
  let message = `HTTP ${r.status}`;
  try {
    const body = (await r.json()) as { error?: string };
    if (body?.error) message = body.error;
  } catch {
    /* ignore */
  }
  throw new Error(message);
}
