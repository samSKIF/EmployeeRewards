// @ts-check
import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(express.json());

// API Routes
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

app.get('/api/firebase-config', (req, res) => {
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

// Static HTML routes
app.get('/direct-login', (req, res) => {
  const filePath = join(__dirname, '../client/direct-login.html');
  console.log('Looking for direct-login.html at:', filePath);
  
  if (fs.existsSync(filePath)) {
    console.log('Found direct-login.html, serving file');
    res.sendFile(filePath);
  } else {
    console.log('direct-login.html not found');
    res.status(404).send('File not found. The direct-login.html file is missing.');
  }
});

// Root page
app.get('/', (req, res) => {
  console.log('Serving dashboard page');
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

// Serve all other routes at the root
app.get('*', (req, res) => {
  console.log('Redirecting to root:', req.path);
  res.redirect('/');
});

// Create HTTP server
const server = createServer(app);

// Start the server and listen on port 5000
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Export for testing
export default app;