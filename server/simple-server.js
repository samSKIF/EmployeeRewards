import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());
app.use(express.static('client/dist')); // Serve static files

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Sample API endpoint
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

// Mock authentication endpoints for testing
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@example.com' && password === 'admin123') {
    res.json({
      uid: 'mock-uid-123',
      email: 'admin@example.com',
      name: 'Admin User',
      username: 'admin',
      isAdmin: true,
      department: 'Management',
      points: 100
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/user', (req, res) => {
  // For testing, we'll return a mock authenticated user
  res.json({
    uid: 'mock-uid-123',
    email: 'admin@example.com',
    name: 'Admin User',
    username: 'admin',
    isAdmin: true,
    department: 'Management',
    points: 100
  });
});

// Fall back to index.html for all other requests (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(join('client', 'dist', 'index.html'), { root: '.' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple server running on port ${PORT}`);
});