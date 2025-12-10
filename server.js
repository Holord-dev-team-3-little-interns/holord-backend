require("dotenv").config();
const fs = require("fs"); // ADD THIS!
const express = require("express");
const cors = require("cors");
const path = require("path");

const generateRoute = require("./routes/generate");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for production
const allowedOrigins = [
  "http://localhost:3000",
  "https://holord.vercel.app",
  "https://newholordvsc.vercel.app", // ⬅️ ADD YOUR FRONTEND URL
  "https://*.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve static clothing folder (so you can verify files exist)
app.use("/clothing", express.static(path.join(__dirname, "clothing")));

// API routes
app.get("/api/status", (req, res) => {
  res.send("Holord Backend Running 🚀");
});

// Health check endpoint for Render (REQUIRED)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "holord-backend",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    port: PORT
  });
});

// Test endpoint with file listing (to verify clothing files)
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
      totalFiles: files.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working!",
    timestamp: new Date().toISOString(),
    backendUrl: "https://holord-backend.onrender.com"
  });
});

// Use generate route
app.use("/generate", generateRoute);

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📁 Clothing files: http://0.0.0.0:${PORT}/api/files`);
  console.log(`🎯 Generate endpoint: POST http://0.0.0.0:${PORT}/generate`);
});