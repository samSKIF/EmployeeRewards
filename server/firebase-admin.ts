import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function initializeFirebase() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id || "fripl-d2c13";

  console.log("Server Firebase projectId from service account:", serviceAccount.project_id);
  console.log("Using project ID:", projectId);

  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: projectId
  });

  console.log("Server using Firebase projectId:", projectId);
  
  return app;
}

const app = initializeFirebase();
export const auth = getAuth(app);
export { app };