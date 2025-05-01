import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration based on environment
if (process.env.NODE_ENV === "production") {
  // In production, use a more permissive CORS setup initially for debugging
  app.use(cors({
    origin: true, // Allow requests from any origin in production for now
    credentials: true
  }));
} else {
  // In development, allow requests from the development server
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );
}

// API routes - important to define these before the static file middleware
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  try {
    const frontendBuildPath = path.resolve(__dirname, "../../../frontend/dist");
    console.log("Serving static files from:", frontendBuildPath);
    
    // Serve static files from the frontend build
    app.use(express.static(frontendBuildPath));
    
    // For any route not matching API routes, serve the frontend index.html
    app.get("*", (req, res) => {
      // Make sure the url doesn't contain invalid path parameters
      if (req.url.includes(':')) {
        console.warn(`Potentially invalid URL pattern detected: ${req.url}`);
        return res.status(400).send('Invalid URL pattern');
      }
      
      res.sendFile(path.join(frontendBuildPath, "index.html"));
    });
  } catch (error) {
    console.error("Error setting up static file serving:", error);
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

server.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  connectDB();
});