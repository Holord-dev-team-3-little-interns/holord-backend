const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("🔍 Checking MONGO_URI environment variable...");
    
    // Get MONGO_URI from environment
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error("❌ MONGO_URI is not set in environment variables!");
      console.error("⚠️ Please add MONGO_URI to Render Environment tab");
      console.error("⚠️ Current value:", mongoUri);
      console.log("⚠️ Continuing WITHOUT database connection...");
      console.log("⚠️ Auth will use temporary in-memory storage");
      return; // Don't exit, just return
    }
    
    console.log("✅ MONGO_URI found, attempting connection...");
    
    await mongoose.connect(mongoUri, {
      dbName: "holord"
    });
    
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.log("⚠️ Continuing without database connection...");
    // DON'T EXIT! Let server run without DB
  }
};

module.exports = connectDB;