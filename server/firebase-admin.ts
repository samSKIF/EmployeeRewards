import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Parse the service account JSON string
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

// Initialize Firebase Admin with service account credentials if available
// Otherwise, fall back to basic initialization
const firebaseApp = initializeApp(
  serviceAccount 
    ? {
        credential: cert(serviceAccount)
      }
    : {
        projectId: process.env.VITE_FIREBASE_PROJECT_ID
      }
);

// Export the auth module for verifying tokens
export const auth = getAuth(firebaseApp);