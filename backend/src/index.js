import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import fs from "fs";

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

// Function to get the appropriate frontend URL based on environment
const getFrontendUrl = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    return process.env.PRODUCTION_URL || 'https://lynqit.onrender.com';
  } else {
    return process.env.LOCAL_URL || 'http://localhost:5173';
  }
};

// CORS configuration based on environment
if (process.env.NODE_ENV === "production") {
  // In production, use the production URL for CORS
  app.use(cors({
    origin: getFrontendUrl(),
    credentials: true
  }));
  console.log(`CORS configured for production with origin: ${getFrontendUrl()}`);
} else {
  // In development, use the local URL for CORS
  app.use(
    cors({
      origin: getFrontendUrl(),
      credentials: true,
    })
  );
  console.log(`CORS configured for development with origin: ${getFrontendUrl()}`);
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
    // Path resolution for different environments including Render
    let frontendBuildPath;

    // Check if we're on Render (they have a specific path structure)
    if (process.env.RENDER) {
      frontendBuildPath = path.resolve('/opt/render/project/src/frontend/dist');
    } else {
      // Default path resolution for other environments
      frontendBuildPath = path.resolve(__dirname, "../../../frontend/dist");
    }

    console.log("Serving static files from:", frontendBuildPath);

    // Check if the directory exists
    if (!fs.existsSync(frontendBuildPath)) {
      console.error(`Frontend build directory not found at ${frontendBuildPath}`);
      console.error(`Current directory: ${process.cwd()}`);
      console.error(`__dirname: ${__dirname}`);
    }

    // Serve static files from the frontend build
    app.use(express.static(frontendBuildPath));

    // For any route not matching API routes, serve the frontend index.html
    // Use an explicit middleware instead of app.get("*") to avoid path-to-regexp issues
    app.use((req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return next();
      }

      // Log the URL for debugging
      console.log(`Serving frontend for path: ${req.path}`);

      // Serve the index.html file
      res.sendFile(path.join(frontendBuildPath, "index.html"));
    });
  } catch (error) {
    console.error("Error setting up static file serving:", error);
    console.error("Stack trace:", error.stack);
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
  console.log(`Frontend URL: ${getFrontendUrl()}`);
  connectDB();
});