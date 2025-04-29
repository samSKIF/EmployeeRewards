
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Parse the service account JSON string
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

// Log Firebase configuration for debugging
console.log(`Server Firebase projectId: ${process.env.VITE_FIREBASE_PROJECT_ID}`);

// Force using the client projectId regardless of what's in the environment
const CLIENT_PROJECT_ID = "fripl-d2c13";

// Log what we're using
console.log(`Server using Firebase projectId: ${CLIENT_PROJECT_ID} (hardcoded)`);
console.log(`Environment had: ${process.env.VITE_FIREBASE_PROJECT_ID}`);

// Initialize Firebase Admin with service account credentials if available
// Otherwise, fall back to basic initialization with the known client project ID
const firebaseApp = initializeApp(
  serviceAccount 
    ? {
        credential: cert({
          projectId: CLIENT_PROJECT_ID,
          ...serviceAccount
        })
      }
    : {
        projectId: CLIENT_PROJECT_ID
      }
);

// Export both the app and auth for use in other modules
export const app = firebaseApp;
export const auth = getAuth(firebaseApp);
