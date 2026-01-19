import dotenv from "dotenv";
dotenv.config(); // Load environment variables FIRST

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";
import routeRoutes from "./routes/routes.routes.js";
import userRoutes from "./routes/user.routes.js";
import workerService from "./services/worker.service.js";

// Start background workers
workerService.start();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
import cluster from "node:cluster";
import os from "node:os";

// Cluster API for Scalability (Support 1000+ Concurrent Users)
// In production, use all cores. In dev, use 2 for testing.
// Note: Background workers should ideally run on a separate process or only on Primary.
const numCPUs = os.cpus().length;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Cluster for High Availability
if (cluster.isPrimary && isProduction) {
  console.log(`🚀 Master process ${process.pid} is running`);
  console.log(`🔥 Forking ${numCPUs} workers for high concurrency...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker death
  cluster.on("exit", (worker, code, signal) => {
    console.log(`⚠️ Worker ${worker.process.pid} died. Respawning...`);
    cluster.fork();
  });
  
  // Start background services ONLY on primary to avoid duplication
  // workerService.start(); // If worker service handles cron jobs, keep it here.
  
} else {
  // Worker processes share the TCP connection
  
  // Database connection optimization for High Concurrency
  // Increase pool size to handle 1000+ concurrent connections distributed across workers
  mongoose
    .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/fleetflow", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 100, // Optimized for 1000+ users
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      // console.log(`✅ Worker ${process.pid} connected to MongoDB`);
    })
    .catch((error) => {
      console.error("❌ MongoDB connection error:", error);
    });

    // Start background workers
    workerService.start();

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "FleetFlow API is running" });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/routes", routeRoutes);
  app.use("/api/users", userRoutes);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  // 404 handler
  app.use("*", (req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
  });

  app.listen(PORT, () => {
    console.log(`🚀 Worker ${process.pid} serving on http://localhost:${PORT}`);
  });
}
