
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase only if no apps exist
const initializeFirebase = (appName?: string) => {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id || "fripl-d2c13";

  // Only initialize if no default app exists or if a specific name is provided
  if (getApps().length === 0 || appName) {
    console.log(`Initializing Firebase app${appName ? ` (${appName})` : ''} with project ID: ${projectId}`);
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId
    }, appName);
  }

  return getApps()[0];
};

// Initialize default app
const app = initializeFirebase();
const auth = getAuth(app);

export { app, auth };
