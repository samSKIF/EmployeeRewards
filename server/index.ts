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
      log(`Port ${port} is already in use.`);
      // Process will exit with code 0 (success) to allow restart
      process.exit(0);
    } else {
      console.error("Server error:", error);
      process.exit(1);
    }
  });

  server.listen(port, "0.0.0.0", () => {
    log(`Server listening on port ${port}`);

    // Start full initialization in background
    setTimeout(() => {
      import("./full-init").catch(err => {
        console.error("Error loading full initialization:", err);
      });
    }, 100);
  });
}

startServer().catch(console.error);