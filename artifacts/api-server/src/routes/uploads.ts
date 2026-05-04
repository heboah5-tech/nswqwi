import { Router, type IRouter, type Request } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { getBucket } from "../lib/firebase";
import { logger } from "../lib/logger";
import { requireAuth } from "./admin";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  // 4 MB — chosen to stay safely under Netlify Functions' ~6 MB request
  // body limit after multipart + base64 transport overhead. The standalone
  // (non-serverless) Replit deploy could safely accept larger uploads.
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

router.post(
  "/uploads/receipt",
  requireAuth,
  upload.single("file"),
  async (req: Request, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      const ext = file.originalname.split(".").pop() || "bin";
      const objectName = `receipts/${randomUUID()}.${ext}`;
      const bucket = getBucket();
      const fileRef = bucket.file(objectName);
      const downloadToken = randomUUID();
      await fileRef.save(file.buffer, {
        contentType: file.mimetype,
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
      });
      // Build a Firebase Storage download URL using the token (publicly readable
      // without making the bucket public).
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        objectName,
      )}?alt=media&token=${downloadToken}`;
      res.status(201).json({ url, objectName });
    } catch (err) {
      logger.error({ err }, "Failed to upload receipt");
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to upload receipt",
      });
    }
  },
);

export default router;
