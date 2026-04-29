import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized — please sign in" });
    return;
  }
  const claims = auth.sessionClaims as Record<string, unknown> | null;
  const role =
    (claims?.["metadata"] as Record<string, unknown> | undefined)?.role ??
    claims?.["role"];
  if (role !== "admin") {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized — please sign in" });
    return;
  }
  next();
}
