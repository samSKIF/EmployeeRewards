import express from "express";
import { createServer } from "http";
import { log } from "./vite";

import { setupVite } from "./vite";

async function startServer() {
  const app = express();
  (global as any).expressApp = app;

  // Create HTTP server
  const server = createServer(app);
  (global as any).httpServer = server;

  // In development, set up Vite middleware
  if (process.env.NODE_ENV === 'development') {
    await setupVite(app, server);
  }

  // Health check route
  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });

  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      log(`Port ${port} is already in use. Attempting to kill process and retry...`);
      
      // For Replit environment - try a different approach to handle port conflicts
      try {
        // Try using a different port if the default one is in use
        const newPort = port + 1;
        log(`Trying to use port ${newPort} instead...`);
        server.listen(newPort, "0.0.0.0", () => {
          log(`Server listening on alternative port ${newPort}`);
          
          // Start full initialization in background with a longer timeout
          setTimeout(() => {
            import("./full-init").catch(err => {
              console.error("Error loading full initialization:", err);
            });
          }, 50); 
        });
      } catch (retryError) {
        log(`Failed to use alternative port. Exiting.`);
        // Process will exit with code 0 (success) to allow restart
        process.exit(0);
      }
    } else {
      console.error("Server error:", error);
      process.exit(1);
    }
  });

  // Immediately start listening on the port to satisfy Replit's workflow timeout
  server.listen(port, "0.0.0.0", () => {
    log(`Server listening on port ${port}`);

    // Start full initialization in background with a longer timeout
    // This helps with the Replit workflow 20-second timeout constraint
    setTimeout(() => {
      import("./full-init").catch(err => {
        console.error("Error loading full initialization:", err);
      });
    }, 50); // Reduced timeout for faster initialization
  });
}

startServer().catch(console.error);