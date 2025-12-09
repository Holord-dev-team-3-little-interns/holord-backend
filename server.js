// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const path = require("path");

// const generateRoute = require("./routes/generate"); // <-- Import the route

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded images

// // Serve frontend static files (SPA)
// const frontendPath = path.join(__dirname, "..", "frontend");
// app.use(express.static(frontendPath));

// // API-only status route
// app.get("/api/status", (req, res) => {
//   res.send("Holord Backend Running 🚀");
// });

// // Use generate route
// app.use("/generate", generateRoute);

// // app.get('/*', (req,res) => res.sendFile(path.join(frontendPath,'index.html')));

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });


require("dotenv").config();
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
  "https://*.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      origin.match(new RegExp(allowedOrigin.replace('*', '.*')))
    )) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working!",
    timestamp: new Date().toISOString()
  });
});

// Use generate route
app.use("/generate", generateRoute);

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
});