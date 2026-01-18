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
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/fleetflow", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
  });

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
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
