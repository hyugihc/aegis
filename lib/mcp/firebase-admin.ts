import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

export function getAdminFirestore(): Firestore | null {
  if (adminDb) return adminDb;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "murub-1eb94";

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Handle escaped newlines in environment variable
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  try {
    if (getApps().length > 0) {
      adminApp = getApps()[0];
      adminDb = getFirestore(adminApp);
      return adminDb;
    }

    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
      adminDb = getFirestore(adminApp);
      return adminDb;
    }

    if (clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      adminDb = getFirestore(adminApp);
      return adminDb;
    }

    // Attempt default initialization only if GOOGLE_APPLICATION_CREDENTIALS or GCF environment is present
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      adminApp = initializeApp({ projectId });
      adminDb = getFirestore(adminApp);
      return adminDb;
    }

    return null;
  } catch (error) {
    console.warn("[Aegis MCP] Firebase Admin init notice:", error);
    return null;
  }
}
