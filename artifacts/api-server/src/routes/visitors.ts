import { Router, type IRouter } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "../lib/firebase";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MAX_PAYLOAD_BYTES = 32 * 1024;
const ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

router.post("/visitor-data", async (req, res) => {
  try {
    const body = req.body as unknown;
    if (!isPlainObject(body)) {
      return res.status(400).json({ error: "body must be a JSON object" });
    }

    const id = body["id"];
    if (typeof id !== "string" || !ID_REGEX.test(id)) {
      return res
        .status(400)
        .json({ error: "id is required and must be a safe string" });
    }

    const { id: _omitId, ...rest } = body;
    void _omitId;

    const serialized = JSON.stringify(rest);
    if (serialized.length > MAX_PAYLOAD_BYTES) {
      return res.status(413).json({ error: "payload too large" });
    }

    const db = getDb();
    await db
      .collection("visitors")
      .doc(id)
      .set(
        {
          ...rest,
          timestamp: Timestamp.now(),
        },
        { merge: true },
      );

    return res.json({ ok: true, id });
  } catch (err) {
    logger.error({ err }, "visitor-data write failed");
    return res.status(500).json({ error: "internal error" });
  }
});

export default router;
