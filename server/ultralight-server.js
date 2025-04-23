/**
 * Ultra-lightweight Express server in CommonJS format
 * This server is designed for maximum compatibility and minimal startup time
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());

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

// Serve the direct login page if it exists
app.get('/direct-login', (req, res) => {
  const filePath = path.join(__dirname, '../client/direct-login.html');
  console.log('Looking for direct-login.html at:', filePath);
  
  if (fs.existsSync(filePath)) {
    console.log('Found direct-login.html, serving file');
    res.sendFile(filePath);
  } else {
    console.log('direct-login.html not found');
    res.status(404).send('File not found. The direct-login.html file is missing.');
  }
});

// Root route with dashboard
app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Empulse - Employee Engagement Platform</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: linear-gradient(135deg, #5B21B6, #1D4ED8);
          color: white;
          text-align: center;
        }
        .container {
          max-width: 800px;
          padding: 2rem;
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(to right, #fff, #f0f0f0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .actions {
          margin-top: 2rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        .btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }
        .status {
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 0.5rem;
          max-width: 100%;
          overflow-x: auto;
        }
        .status pre {
          margin: 0;
          text-align: left;
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Empulse</h1>
        <p>Employee Engagement Platform</p>
        
        <div class="actions">
          <a href="/direct-login" class="btn">Firebase Direct Login</a>
          <a href="/api/hello" class="btn">API Test Endpoint</a>
          <a href="/api/firebase-config" class="btn">Firebase Config</a>
        </div>
        
        <div class="status">
          <h3>Environment Status</h3>
          <pre>Server: Running
Firebase API Key: ${process.env.VITE_FIREBASE_API_KEY ? 'Available ✓' : 'Missing ✗'}
Firebase Project ID: ${process.env.VITE_FIREBASE_PROJECT_ID ? 'Available ✓' : 'Missing ✗'}
Firebase App ID: ${process.env.VITE_FIREBASE_APP_ID ? 'Available ✓' : 'Missing ✗'}</pre>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Wildcard route
app.get('*', (req, res) => {
  console.log('Wildcard route hit for:', req.path);
  res.redirect('/');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ultralight server running on port ${PORT}`);
  console.log('Press Ctrl+C to quit');
});

// Export the app for testing
module.exports = app;