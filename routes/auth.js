const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Test route to verify auth router is working
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth router is working!",
    timestamp: new Date().toISOString(),
    endpoints: {
      signup: "POST /api/auth/signup",
      login: "POST /api/auth/login"
    }
  });
});

// 🔐 SIGN UP
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

    console.log("✅ User created successfully:", user._id);
    
    res.json({ 
      success: true, 
      message: "User created successfully",
      userId: user._id
    });
  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during signup",
      error: error.message 
    });
  }
});

// 🔑 LOGIN
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

  try {
    console.log("🔍 Looking for user:", email);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log("❌ No user found with email:", email);
      return res.status(400).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    console.log("✅ User found:", user._id);
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

    console.log("✅ Login successful for:", email);
    console.log("🎫 Token generated");
    
    res.json({
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
    console.error("❌ Login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during login",
      error: error.message 
    });
  }
});

module.exports = router;