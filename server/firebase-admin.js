const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin SDK if not already initialized
let initialized = false;

function initializeFirebaseAdmin() {
  if (initialized) return;

  try {
    // Initialize with environment variables
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    
    initialized = true;
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
    throw error;
  }
}

// Verify Firebase ID token
async function verifyIdToken(idToken) {
  if (!initialized) {
    initializeFirebaseAdmin();
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return { 
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      isAuthenticated: true
    };
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return { isAuthenticated: false };
  }
}

// Middleware to authenticate Firebase token
function authenticateFirebase(req, res, next) {
  // Get the ID token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Missing or invalid token format' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  // Verify the ID token
  verifyIdToken(idToken)
    .then(user => {
      if (user.isAuthenticated) {
        // Add the user to the request
        req.user = user;
        next();
      } else {
        res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }
    })
    .catch(error => {
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Internal server error during authentication' });
    });
}

module.exports = {
  admin,
  verifyIdToken,
  authenticateFirebase,
  initializeFirebaseAdmin
};