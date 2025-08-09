import express, { type Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import { initializeApiGateway } from './gateway/api-gateway.init';
import managementRoutes from './management-routes';
import dualWriteManagementRoutes from './routes/dual-write-management';
import { setupVite, serveStatic, log } from './vite';
import healthRouter from './routes/health';
import { correlationId } from './middleware/correlation-id';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { tenant } from './middleware/tenant';
import readyRouter from './routes/ready';
import { initGracefulShutdown } from './bootstrap/shutdown';
import { start as startBus } from './services/bus';
import { startEmployeeCreatedAuditConsumer } from './consumers/employee-created-audit';
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

// Platform-standard middlewares (early in pipeline)
app.use(correlationId);
app.use(requestLogger);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Readiness probe (before tenant middleware)
app.use(readyRouter);

// Multi-tenant safety enforcement (before routes)
app.use(tenant(true)); // require tenant by default; relax to false on public routes if needed

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

  // Initialize event bus and consumers
  await startBus();
  await startEmployeeCreatedAuditConsumer();

  // Add management routes for SaaS backend
  app.use('/api/management', managementRoutes);
  
  // Add dual-write management routes for microservices migration
  app.use('/api/dual-write', dualWriteManagementRoutes);

  // Internal service routes (opt-in protection)
  const internalRouter = (await import('./routes/internal-example')).default;
  app.use(internalRouter);

  // Platform health check route
  app.use(healthRouter);

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(503).json({
        status: 'unhealthy',
        error: errorMessage,
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

  // Platform error handler (must be last middleware)
  app.use(errorHandler);

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  httpServer.listen(port, '0.0.0.0', () => {
    log(`serving on port ${port}`);
  });

  // Initialize graceful shutdown with 25s grace (tune to k8s terminationGracePeriodSeconds)
  initGracefulShutdown(httpServer, { graceMs: 25000 });
})();
