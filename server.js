require("dotenv").config();
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const generateRoute = require("./routes/generate");

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ============ CORS CONFIGURATION - SIMPLIFIED FOR DEBUGGING ============
app.use(cors({
  origin: '*', // Allow all origins temporarily for debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400
}));

// Handle preflight requests
app.options('*', cors());

// ============ MIDDLEWARE ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/clothing", express.static(path.join(__dirname, "clothing")));

// ============ REQUEST LOGGING MIDDLEWARE ============
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  if (req.method === 'POST' && req.originalUrl.includes('/auth')) {
    console.log('Body:', { ...req.body, password: req.body.password ? '***' : 'missing' });
  }
  next();
});

// ============ MAIN APPLICATION ROUTES ============
// THESE MUST COME BEFORE ALL TEST ENDPOINTS
app.use("/api/auth", authRoutes);
app.use("/generate", generateRoute);

// ============ ESSENTIAL KEEP-AWAKE ENDPOINTS ============

// Root endpoint - Shows API info
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "holord-backend",
    version: "1.0",
    timestamp: new Date().toISOString(),
    message: "Welcome to Holord Virtual Try-On Backend",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    availableEndpoints: [
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "POST /generate",
      "GET /",
      "GET /ping",
      "GET /wake", 
      "GET /health",
      "GET /api/status",
      "GET /api/files",
      "GET /api/test",
      "GET /api/cors-test"
    ],
    documentation: "Use /ping endpoint for uptime monitoring"
  });
});

// Ping endpoint - For UptimeRobot (5-minute intervals)
app.get("/ping", (req, res) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "holord-backend",
    message: "Backend is awake and responding",
    note: "This endpoint should be pinged every 5 minutes to keep Render awake"
  });
});

// Wake-up endpoint - Manual wake trigger
app.get("/wake", (req, res) => {
  res.status(200).json({
    status: "waking",
    timestamp: new Date().toISOString(),
    message: "Backend warming up from sleep",
    note: "First request after sleep takes 30-60 seconds on Render free tier"
  });
});

// Health check endpoint for Render (MUST BE FAST)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "holord-backend",
    environment: process.env.NODE_ENV || "development",
    port: PORT,
    authRoutes: true,
    generateRoute: true
  });
});

// ============ API TEST ENDPOINTS ============

// API status
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    message: "Holord Backend Running 🚀",
    timestamp: new Date().toISOString(),
    auth: {
      signup: "POST /api/auth/signup",
      login: "POST /api/auth/login"
    },
    cors: req.headers.origin ? `Origin: ${req.headers.origin} allowed` : "No origin header"
  });
});

// File listing endpoint
app.get("/api/files", (req, res) => {
  try {
    const clothingPath = path.join(__dirname, "clothing");
    let files = [];
    
    if (fs.existsSync(clothingPath)) {
      files = fs.readdirSync(clothingPath);
    }
    
    res.json({
      success: true,
      clothingFiles: files,
      totalFiles: files.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error reading files:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working!",
    timestamp: new Date().toISOString(),
    backendUrl: "https://holord-backend.onrender.com",
    currentOrigin: req.headers.origin || "No origin header",
    corsTest: "If you see this, CORS is working!",
    authEndpoints: [
      "POST /api/auth/signup",
      "POST /api/auth/login"
    ]
  });
});

// Auth test endpoint - to verify auth routes are working
app.get("/api/auth/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working!",
    timestamp: new Date().toISOString(),
    endpoints: {
      signup: "POST /api/auth/signup",
      login: "POST /api/auth/login"
    }
  });
});

// CORS test endpoint
app.get("/api/cors-test", (req, res) => {
  res.json({
    success: true,
    message: "CORS test successful",
    origin: req.headers.origin || "No origin",
    allowed: true,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// ============ ERROR HANDLING ============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    requestedUrl: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "GET /api/auth/test",
      "POST /generate",
      "GET /",
      "GET /ping",
      "GET /wake",
      "GET /health",
      "GET /api/status",
      "GET /api/files",
      "GET /api/test",
      "GET /api/cors-test"
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  
  // Handle CORS errors specifically
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: "CORS Error: " + err.message,
      timestamp: new Date().toISOString(),
      yourOrigin: req.headers.origin || 'Not provided',
      solution: "Make sure your frontend domain is in allowedOrigins array"
    });
  }
  
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
    timestamp: new Date().toISOString()
  });
});

// ============ START SERVER ============
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`✅ CORS enabled for ALL origins (temporary for debugging)`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   POST http://0.0.0.0:${PORT}/api/auth/signup`);
  console.log(`   POST http://0.0.0.0:${PORT}/api/auth/login`);
  console.log(`   GET  http://0.0.0.0:${PORT}/api/auth/test`);
  console.log(`🎯 Generate endpoint: POST http://0.0.0.0:${PORT}/generate`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`⏰ Keep-awake endpoint: GET http://0.0.0.0:${PORT}/ping`);
  console.log(`✅ Set up UptimeRobot to ping: https://holord-backend.onrender.com/ping every 5 minutes`);
  
  // Test that auth routes are loaded
  console.log(`\n✅ Auth routes loaded:`, authRoutes ? 'Yes' : 'No');
  console.log(`✅ Generate route loaded:`, generateRoute ? 'Yes' : 'No');
  
  setTimeout(() => {
    console.log(`\n✅ Server fully initialized at: ${new Date().toISOString()}`);
  }, 1000);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});