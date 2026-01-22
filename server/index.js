import dotenv from "dotenv";
dotenv.config(); // Load environment variables FIRST

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";
import routeRoutes from "./routes/routes.routes.js";
import userRoutes from "./routes/user.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import deliveryRoutes from "./routes/deliveries.routes.js";
import vehicleRoutes from "./routes/vehicles.routes.js";
import workerService from "./services/worker.service.js";
import passport from "passport";
import configurePassport from "./services/passport.service.js";
import http from "http";
import socketService from "./services/socket.service.js";

// Background workers now started per process or on primary (see below)

const app = express();
app.set('trust proxy', 1); // Enable trust proxy for Nginx
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Initialize Socket.io
socketService.init(server);

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL, 
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3002', 
    'http://localhost:5173', 
    'https://13-211-252-48.sslip.io', 
    'https://localhost'
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport initialization
configurePassport();
app.use(passport.initialize());

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/fleetflow", {
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    family: 4 // Force IPv4 to avoid dual-stack issues on Render
  })
  .then(() => {
    console.log(`✅ Connected to MongoDB`);
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
  });

// Start background workers
// workerService.start();

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "FleetFlow API is running" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/vehicles", vehicleRoutes);

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

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
