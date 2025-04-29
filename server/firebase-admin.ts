
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Log the Firebase project ID for debugging
console.log("Server Firebase projectId:", serviceAccount.project_id);

// Initialize Firebase Admin with the correct project ID from service account
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id || "fripl-d2c13"
});

// Log which project ID we're using
console.log("Server using Firebase projectId:", serviceAccount.project_id || "fripl-d2c13", serviceAccount.project_id ? "(from service account)" : "(hardcoded)");
console.log("Environment had:", process.env.VITE_FIREBASE_PROJECT_ID);

// Export auth for use in other modules
export const auth = getAuth(app);
export { app };
