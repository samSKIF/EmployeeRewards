
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Use the proper project ID based on environment variables 
// or service account if available
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id || "fripl-d2c13";

// Log the Firebase project ID for debugging
console.log("Server Firebase projectId from service account:", serviceAccount.project_id);
console.log("Using project ID:", projectId);

// Initialize Firebase Admin with the correct project ID 
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: projectId
});

// Log which project ID we're using
console.log("Server using Firebase projectId:", projectId);

// Export auth for use in other modules
export const auth = getAuth(app);
export { app };
