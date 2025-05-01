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

app.use(express.json());
app.use(cookieParser());

// CORS configuration based on environment
if (process.env.NODE_ENV === "production") {
  // In production, no need for CORS as frontend and backend are on same origin
  app.use(cors());
} else {
  // In development, allow requests from the development server
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );
}

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const frontendBuildPath = path.resolve(__dirname, "../../../frontend/dist");
  
  // Serve static files from the frontend build
  app.use(express.static(frontendBuildPath));

  // For any route not matching API routes, serve the frontend
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

server.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  connectDB();
});