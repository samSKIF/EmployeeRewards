import express, { type Request, Response, NextFunction } from "express";
import { scheduleBirthdayRewards } from "./middleware/scheduler";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";

// This module contains the full initialization logic that runs
// after the server has already started listening on port 5000

// Get reference to the Express app
const app = (global as any).expressApp || express();
(global as any).expressApp = app;

// Initialize middleware that wasn't in the minimal setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Start the full initialization
async function initializeFullApp() {
  try {
    // Register API routes
    await registerRoutes(app);
    
    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      res.status(status).json({ message });
      console.error(err);
    });
    
    // Set up Vite for development or static files for production
    if (app.get("env") === "development") {
      // Get the server that's already running from global scope
      const server = (global as any).httpServer || createServer(app);
      (global as any).httpServer = server;
      
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    // Start the birthday rewards scheduler
    scheduleBirthdayRewards();
    
    log("Application fully initialized");
  } catch (error) {
    console.error("Error during full initialization:", error);
  }
}

// Run the initialization
initializeFullApp().catch(err => {
  console.error("Failed to complete full initialization:", err);
});