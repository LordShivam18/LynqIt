import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import fs from "fs";

import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import twofaRoutes from "./routes/twofa.route.js";
import userRoutes from "./routes/user.route.js";
import statusRoutes from "./routes/status.route.js";
import { app, server } from "./lib/socket.js";

// Security middleware
import {
  securityHeaders,
  sanitizeInput,
  generateCSRFToken
} from "./middleware/security.middleware.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic middleware (must come before security middleware that uses cookies)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // We'll handle this manually
  crossOriginEmbedderPolicy: false
}));
app.use(securityHeaders);
app.use(sanitizeInput);
app.use(generateCSRFToken);

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

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// API routes - important to define these before the static file middleware
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/2fa", twofaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/status", statusRoutes);

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