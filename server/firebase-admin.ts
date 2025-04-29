import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!serviceAccount) {
  throw new Error('Firebase service account credentials are required');
}

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: "employee-reward-fb8ea"
});

// Export auth for use in other modules
export const auth = getAuth(app);
export { app };