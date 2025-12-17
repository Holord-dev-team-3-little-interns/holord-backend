const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const mongoose = require("mongoose");

const router = express.Router();

// Check if database is connected
const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Temporary in-memory storage if DB not connected
const tempUsers = {};

// Test route to verify auth router is working
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth router is working!",
    dbConnected: isDBConnected(),
    timestamp: new Date().toISOString(),
    endpoints: {
      signup: "POST /api/auth/signup",
      login: "POST /api/auth/login"
    }
  });
});

// 🔐 SIGN UP - with fallback to temporary storage
router.post("/signup", async (req, res) => {
  console.log("📝 Signup request received:", { email: req.body.email });
  
  const { email, password } = req.body;

  if (!email || !password) {
    console.log("❌ Signup missing fields");
    return res.status(400).json({ 
      success: false,
      message: "Missing email or password" 
    });
  }

  // If DB is connected, use it
  if (isDBConnected()) {
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log("❌ User already exists:", email);
        return res.status(400).json({ 
          success: false,
          message: "User already exists" 
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      console.log("🔑 Password hashed successfully");

      const user = await User.create({
        email,
        password: hashedPassword
      });

      console.log("✅ User created successfully in database:", user._id);
      
      return res.json({ 
        success: true, 
        message: "User created successfully",
        userId: user._id
      });
    } catch (error) {
      console.error("❌ Database signup error:", error);
      // Fall through to temporary storage
    }
  }
  
  // Use temporary storage (fallback)
  if (tempUsers[email]) {
    console.log("❌ User already exists in temporary storage:", email);
    return res.status(400).json({ 
      success: false,
      message: "User already exists" 
    });
  }

  tempUsers[email] = { email, password };
  console.log("✅ User created in temporary storage:", email);
  
  res.json({ 
    success: true, 
    message: "User created (temporary storage)",
    note: "Add MONGO_URI to Render for permanent database storage",
    timestamp: new Date().toISOString()
  });
});

// 🔑 LOGIN - with fallback to temporary storage
router.post("/login", async (req, res) => {
  console.log("🔐 Login attempt received:", { email: req.body.email });
  
  const { email, password } = req.body;

  if (!email || !password) {
    console.log("❌ Login missing fields");
    return res.status(400).json({ 
      success: false,
      message: "Missing email or password" 
    });
  }

  // If DB is connected, use it
  if (isDBConnected()) {
    try {
      console.log("🔍 Looking for user in database:", email);
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log("❌ No user found with email:", email);
        return res.status(400).json({ 
          success: false,
          message: "Invalid email or password" 
        });
      }

      console.log("✅ User found in database:", user._id);
      const isMatch = await bcrypt.compare(password, user.password);
      console.log("🔑 Password match:", isMatch);
      
      if (!isMatch) {
        console.log("❌ Password mismatch for:", email);
        return res.status(400).json({ 
          success: false,
          message: "Invalid email or password" 
        });
      }

      // Check if JWT_SECRET is set
      if (!process.env.JWT_SECRET) {
        console.error("❌ JWT_SECRET is not set in environment variables");
        return res.status(500).json({
          success: false,
          message: "Server configuration error"
        });
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      console.log("✅ Login successful (database):", email);
      console.log("🎫 Token generated");
      
      return res.json({
        success: true,
        token,
        user: {
          email: user.email,
          id: user._id,
          createdAt: user.createdAt
        },
        message: "Login successful"
      });
    } catch (error) {
      console.error("❌ Database login error:", error);
      // Fall through to temporary storage
    }
  }
  
  // Use temporary storage (fallback)
  console.log("🔍 Looking for user in temporary storage:", email);
  const user = tempUsers[email];
  
  if (!user) {
    console.log("❌ No user found in temporary storage:", email);
    return res.status(400).json({ 
      success: false,
      message: "Invalid email or password" 
    });
  }

  // Simple password check for temporary storage
  if (user.password !== password) {
    console.log("❌ Password mismatch in temporary storage:", email);
    return res.status(400).json({ 
      success: false,
      message: "Invalid email or password" 
    });
  }

  console.log("✅ User found in temporary storage:", email);
  
  // Use JWT_SECRET or fallback
  const jwtSecret = process.env.JWT_SECRET || "temporary-secret-for-development";
  
  const token = jwt.sign(
    { email: user.email, temp: true },
    jwtSecret,
    { expiresIn: "7d" }
  );

  console.log("✅ Login successful (temporary storage):", email);
  console.log("🎫 Token generated");
  
  res.json({
    success: true,
    token,
    user: {
      email: user.email,
      id: "temp-id",
      createdAt: new Date().toISOString()
    },
    message: "Login successful (temporary storage)",
    note: "Add MONGO_URI to Render for permanent database storage",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;