/**
 * Firebase authentication middleware
 */
const admin = require('firebase-admin');

// Middleware to authenticate requests with Firebase
function authenticateFirebase(req, res, next) {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Missing or invalid token format' });
  }

  // Extract the token
  const idToken = authHeader.split('Bearer ')[1];
  
  // Verify the token with Firebase Admin
  admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
      // Add user info to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || '',
        picture: decodedToken.picture || null,
        isAdmin: decodedToken.admin === true // Make sure this is a boolean
      };
      next();
    })
    .catch(error => {
      console.error('Error verifying Firebase token:', error);
      res.status(401).json({ error: 'Unauthorized - Invalid token' });
    });
}

// Middleware to check if user is an admin
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

module.exports = {
  authenticateFirebase,
  requireAdmin
};