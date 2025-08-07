import express, { type Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import { initializeApiGateway } from './gateway/api-gateway.init';
import managementRoutes from './management-routes';
import dualWriteManagementRoutes from './routes/dual-write-management';
import { setupVite, serveStatic, log } from './vite';
// import { createAdminUser } from "./create-admin-user"; // Removed Firebase dependency
import { setupStaticFileServing } from './file-upload';
import path from 'path';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { setWebSocketInstance } from './microservices/recognition';
import { users, organizations } from '@shared/mysql-schema';
import {
  initializeMongoDB,
  setupMongoDBSocialRoutes,
  migrateSocialDataToMongoDB,
} from './mongodb/integration';
import {
  startCelebrationPostCron,
  runCelebrationPostsOnStartup,
} from './jobs/celebrationPostCron';
// Firebase admin removed - using custom JWT authentication only

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Set up static file serving for uploaded files
setupStaticFileServing(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Database initialization - PostgreSQL is primary, MongoDB for social features

  // Initialize MongoDB for social features
  console.log('Initializing MongoDB for social features...');
  const mongoInitialized = await initializeMongoDB();

  // Setup MongoDB social routes BEFORE legacy routes if MongoDB is available
  if (mongoInitialized) {
    await setupMongoDBSocialRoutes(app);
  }

  const server = await registerRoutes(app);

  // Create HTTP server for WebSocket support
  const httpServer = createServer(app);

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Pass WebSocket instance to microservices
  setWebSocketInstance(io);

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join user-specific room for targeted notifications
    socket.on('join', (user_id) => {
      socket.join(`user_${user_id}`);
      console.log(`User ${user_id} joined room`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Initialize API Gateway for standardized routing (parallel deployment)
  await initializeApiGateway(app);

  // Add management routes for SaaS backend
  app.use('/api/management', managementRoutes);
  
  // Add dual-write management routes for microservices migration
  app.use('/api/dual-write', dualWriteManagementRoutes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Health check for individual services
      const health = { status: 'ok', message: 'Services running' };
      const isHealthy = Object.values(health).every((status) => status);

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: health,
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Initialize celebration post generation
  startCelebrationPostCron();

  // Generate celebration posts on startup (for any missed celebrations)
  setTimeout(() => {
    runCelebrationPostsOnStartup();
  }, 5000); // Wait 5 seconds after server startup

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  httpServer.listen(port, '0.0.0.0', () => {
    log(`serving on port ${port}`);
  });
})();
