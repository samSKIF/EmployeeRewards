import express from "express";
import { createServer } from "http";
import { log } from "./vite";

// Create simple Express app that responds to health checks
const app = express();
(global as any).expressApp = app;

// Create HTTP server
const server = createServer(app);
(global as any).httpServer = server;

// Simple route to respond to health checks
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Listen on port 5000 immediately
const port = 5000;
server.listen(port, "0.0.0.0", () => {
  log(`Server listening on port ${port}`);
  
  // After server is confirmed running, start the full initialization
  // in the background
  setTimeout(() => {
    import("./full-init").catch(err => {
      console.error("Error loading full initialization:", err);
    });
  }, 100);
});
