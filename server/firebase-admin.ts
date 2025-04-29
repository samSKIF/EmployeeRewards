
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: "employee-reward-fb8ea"
});

// Export auth for use in other modules
export const auth = getAuth(app);
export { app };
