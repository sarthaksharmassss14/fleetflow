import dotenv from "dotenv";
dotenv.config(); // Load environment variables FIRST

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

import express from "express";
import session from "express-session";

// ... imports remain same ...

const app = express();
app.set('trust proxy', 1); // Enable trust proxy for Nginx/Render to detect HTTPS
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

// Session Middleware (REQUIRED for Passport to maintain state)
app.use(session({
  secret: process.env.JWT_SECRET || 'fallback_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Secure=true on Render
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // None for cross-site
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
configurePassport();
app.use(passport.initialize());
app.use(passport.session()); // Enable persistent login sessions

// Database connection
// Database connection
const connectDB = async () => {
  console.log("🔄 Attempting to connect to MongoDB...");
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error("❌ MONGODB_URI is undefined!");
    process.exit(1);
  }
  
  console.log(`ℹ️ URI found (starts with): ${uri.substring(0, 15)}...`);

  try {
    // Add a 5-second timeout to force a failure if it hangs
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, 
      connectTimeoutMS: 5000,
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    // Exit to restart
    process.exit(1);
  }
};

connectDB();

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
