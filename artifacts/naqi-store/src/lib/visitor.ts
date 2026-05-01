const VISITOR_KEY = "visitor";

function generateVisitorId(): string {
  const cryptoObj =
    typeof globalThis !== "undefined"
      ? (globalThis as { crypto?: Crypto }).crypto
      : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return `v-${cryptoObj.randomUUID()}`;
  }
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const fresh = generateVisitorId();
    window.localStorage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    return "";
  }
}

export function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(VISITOR_KEY);
  } catch {
    return null;
  }
}
