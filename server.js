require("dotenv").config();
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const path = require("path");

const generateRoute = require("./routes/generate");

const app = express();
const PORT = process.env.PORT || 5000;

// ============ CORS CONFIGURATION ============
const allowedOrigins = [
  "http://localhost:3000",
  "https://holord.vercel.app",
  "https://newholordvsc.vercel.app",
  "https://*.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const regex = new RegExp('^' + allowedOrigin.replace('*', '.*') + '$');
        return regex.test(origin);
      }
      return origin === allowedOrigin;
    })) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    endpoints: [
      "/",
      "/ping",
      "/wake",
      "/health",
      "/api/status",
      "/api/files",
      "/api/test",
      "/generate"
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

// Health check endpoint for Render
app.get("/health", (req, res) => {
  // Remove ALL slow operations like fs.readdirSync
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Keep your /api/files separate (slower)
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
      totalFiles: files.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ API TEST ENDPOINTS ============

// API status
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    message: "Holord Backend Running 🚀",
    timestamp: new Date().toISOString()
  });
});

// Test endpoint with file listing
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
      clothingPath: clothingPath,
      totalFiles: files.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
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
    frontendUrls: allowedOrigins.filter(o => !o.includes('*'))
  });
});

// ============ MAIN APPLICATION ROUTES ============

// Use generate route
app.use("/generate", generateRoute);

// ============ ERROR HANDLING ============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    requestedUrl: req.originalUrl,
    availableEndpoints: [
      "GET /",
      "GET /ping",
      "GET /health",
      "GET /api/status",
      "GET /api/files",
      "GET /api/test",
      "POST /generate"
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
    timestamp: new Date().toISOString()
  });
});

// ============ START SERVER ============
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📁 Clothing files: http://0.0.0.0:${PORT}/api/files`);
  console.log(`🎯 Generate endpoint: POST http://0.0.0.0:${PORT}/generate`);
  console.log(`⏰ Keep-awake endpoint: GET http://0.0.0.0:${PORT}/ping`);
  console.log(`✅ Set up UptimeRobot to ping: https://holord-backend.onrender.com/ping every 5 minutes`);
});