require("dotenv").config();
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");

connectDB();


const generateRoute = require("./routes/generate");

const app = express();
const PORT = process.env.PORT || 5000;

// ============ CORS CONFIGURATION - FIXED FOR VERCEL ============
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000", 
  "http://localhost:8080",
  "https://holord.vercel.app",
  "https://newholordvsc.vercel.app",
  "https://*.vercel.app",
  "https://*.onrender.com"  // Allow Render domains too
];

// SIMPLIFIED CORS - Allow all during development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // Allow all during development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        // Handle wildcard domains like *.vercel.app
        const domain = allowedOrigin.replace('*.', '');
        return origin.endsWith(domain);
      }
      return origin === allowedOrigin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`⚠️ CORS request from: ${origin} - Allowing for debugging`);
      // Temporarily allow all for debugging
      callback(null, true);
      // For production, use: callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 hours
}));

// Handle preflight requests
app.options('*', cors());

// ============ MIDDLEWARE ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/clothing", express.static(path.join(__dirname, "clothing")));

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
    cors: {
      allowedOrigins: allowedOrigins,
      currentOrigin: req.headers.origin || 'none'
    },
    endpoints: [
      "GET /",
      "GET /ping",
      "GET /wake", 
      "GET /health",
      "GET /api/status",
      "GET /api/files",
      "GET /api/test",
      "POST /generate"
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
    port: PORT
  });
});

// ============ API TEST ENDPOINTS ============

// API status
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    message: "Holord Backend Running 🚀",
    timestamp: new Date().toISOString(),
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
    frontendUrls: allowedOrigins.filter(o => !o.includes('*'))
  });
});

// CORS test endpoint
app.get("/api/cors-test", (req, res) => {
  res.json({
    success: true,
    message: "CORS test successful",
    origin: req.headers.origin || "No origin",
    allowed: true,
    headers: req.headers
  });
});

// ============ MAIN APPLICATION ROUTES ============

// Use generate route
app.use("/api/auth", authRoutes);

app.use("/generate", generateRoute);

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
      "GET /",
      "GET /ping",
      "GET /wake",
      "GET /health",
      "GET /api/status",
      "GET /api/files",
      "GET /api/test",
      "GET /api/cors-test",
      "POST /generate"
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
      allowedOrigins: allowedOrigins,
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
  console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📁 Clothing files: http://0.0.0.0:${PORT}/api/files`);
  console.log(`🎯 Generate endpoint: POST http://0.0.0.0:${PORT}/generate`);
  console.log(`⏰ Keep-awake endpoint: GET http://0.0.0.0:${PORT}/ping`);
  console.log(`🔧 CORS test: GET http://0.0.0.0:${PORT}/api/cors-test`);
  console.log(`✅ Set up UptimeRobot to ping: https://holord-backend.onrender.com/ping every 5 minutes`);
  
  // Give server time to start before health checks
  setTimeout(() => {
    console.log(`✅ Server fully initialized at: ${new Date().toISOString()}`);
  }, 1000);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});