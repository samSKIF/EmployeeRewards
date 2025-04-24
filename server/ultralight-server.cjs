/**
 * Ultra-lightweight Express server in CommonJS format
 * This server is designed for maximum compatibility and minimal startup time
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Import Firebase Admin SDK utilities
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Firebase Admin SDK initialization error:', error);
  // Continue with server startup even if Firebase Admin fails
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).send('OK');
});

// API test endpoint
app.get('/api/hello', (req, res) => {
  console.log('API hello endpoint hit');
  res.json({ message: 'Hello from the server!' });
});

// Firebase configuration endpoint
app.get('/api/firebase-config', (req, res) => {
  console.log('Firebase config endpoint hit');
  console.log('Firebase environment variables:');
  console.log('- API Key:', process.env.VITE_FIREBASE_API_KEY ? 'Available' : 'Missing');
  console.log('- Project ID:', process.env.VITE_FIREBASE_PROJECT_ID ? 'Available' : 'Missing');
  console.log('- App ID:', process.env.VITE_FIREBASE_APP_ID ? 'Available' : 'Missing');
  
  res.json({
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
  });
});

// Import Firebase authentication middleware
const { authenticateFirebase, requireAdmin } = require('./firebase-middleware.cjs');

// Protected API endpoint requiring Firebase authentication
app.get('/api/user-profile', authenticateFirebase, (req, res) => {
  // req.user is set by the middleware
  res.json({
    message: 'You are authenticated!',
    user: req.user
  });
});

// Points and rewards API endpoints
app.get('/api/points/balance', authenticateFirebase, (req, res) => {
  const userId = req.user.uid;
  // In a real app, this would fetch from Firestore
  res.json({
    userId,
    balance: 500 // Example value
  });
});

app.post('/api/points/earn', authenticateFirebase, requireAdmin, (req, res) => {
  const { userId, amount, reason } = req.body;
  
  if (!userId || !amount || !reason) {
    return res.status(400).json({ error: 'UserId, amount, and reason are required' });
  }
  
  // In a real app, this would update Firestore
  res.json({
    success: true,
    transaction: {
      id: Date.now().toString(),
      userId,
      amount,
      reason,
      type: 'credit',
      createdAt: new Date().toISOString()
    }
  });
});

app.post('/api/points/redeem', authenticateFirebase, (req, res) => {
  const { amount, productId } = req.body;
  const userId = req.user.uid;
  
  if (!amount || !productId) {
    return res.status(400).json({ error: 'Amount and productId are required' });
  }
  
  // In a real app, this would validate points balance and update Firestore
  res.json({
    success: true,
    transaction: {
      id: Date.now().toString(),
      userId,
      amount: -amount,
      reason: `Product redemption: ${productId}`,
      type: 'debit',
      createdAt: new Date().toISOString()
    },
    order: {
      id: Date.now().toString(),
      userId,
      productId,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  });
});

// Serve the direct login page if it exists
app.get('/direct-login', (req, res) => {
  // Get current working directory and use absolute path
  const currentDir = process.cwd();
  const filePath = path.join(currentDir, 'client/direct-login.html');
  console.log('Looking for direct-login.html at:', filePath);
  
  if (fs.existsSync(filePath)) {
    console.log('Found direct-login.html, serving file');
    res.sendFile(filePath);
  } else {
    console.log('direct-login.html not found');
    res.status(404).send('File not found. The direct-login.html file is missing.');
  }
});

// Serve static files for development
const currentDir = process.cwd();
const clientDir = path.join(currentDir, 'client');
const indexHtml = path.join(clientDir, 'index.html');

// Check if client/index.html exists
if (!fs.existsSync(indexHtml)) {
  console.error('Error: client/index.html not found');
}

// Serve React app at root
app.get('/', (req, res) => {
  console.log('Root endpoint hit - serving React app');
  if (fs.existsSync(indexHtml)) {
    // Serve the index.html file for our React app
    res.sendFile(indexHtml);
  } else {
    // If index.html doesn't exist, return an error
    res.status(500).send('Error: client/index.html not found');
  }
});

// Serve static files in the client directory
app.use(express.static(clientDir));

// Wildcard route - serve the React app for client-side routing
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    console.log('API route not found:', req.path);
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  console.log('Wildcard route hit for:', req.path);
  // Send the index.html file for client-side routing
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(500).send('Error: client/index.html not found');
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ultralight server running on port ${PORT}`);
  console.log('Press Ctrl+C to quit');
});

// Export the app for testing
module.exports = app;