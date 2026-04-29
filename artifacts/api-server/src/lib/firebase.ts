import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "./logger";

let app: App | undefined;

function getApp(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  const raw = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is required",
    );
  }
  const bucket = process.env["FIREBASE_STORAGE_BUCKET"];
  if (!bucket) {
    throw new Error(
      "FIREBASE_STORAGE_BUCKET environment variable is required",
    );
  }

  let serviceAccount: { project_id: string; client_email: string; private_key: string };
  try {
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: " +
        (err instanceof Error ? err.message : String(err)),
    );
  }

  app = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    }),
    storageBucket: bucket,
  });

  logger.info(
    { projectId: serviceAccount.project_id, bucket },
    "Firebase Admin initialized",
  );
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getApp());
}

export function getBucket() {
  return getStorage(getApp()).bucket();
}
