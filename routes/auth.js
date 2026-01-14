const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// ============== HARDCODED CLIENT ACCOUNTS ==============
// YOU MANAGE THIS - UPDATE MONTHLY
// Format: email: {password: "xxx", expires: "yyyy-mm-dd", name: "Client Name"}
const clientAccounts = {
    // Client 1 - January 2024 (Example)
    "client1@company.com": {
        password: "HolordJan2024",
        expires: "2024-02-15",
        name: "Client One",
        plan: "monthly"
    },
    
    // Client 2 - January 2024 (Example)  
    "client2@business.com": {
        password: "SecurePass456",
        expires: "2024-02-20",
        name: "Client Two",
        plan: "monthly"
    },
    
    // Demo Account (for testing)
    "demo@holord.com": {
        password: "Demo2024!",
        expires: "2026-12-31",
        name: "Demo User",
        plan: "demo"
    }
};
// ======================================================

// Test route
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Auth router is working!",
        totalAccounts: Object.keys(clientAccounts).length,
        timestamp: new Date().toISOString()
    });
});

// 🔐 LOGIN - HARDCODED ACCOUNTS ONLY
router.post("/login", async (req, res) => {
    try {
        console.log("🔐 Login attempt:", { email: req.body.email });
        
        const { email, password } = req.body;

        if (!email || !password) {
            console.log("❌ Login missing fields");
            return res.status(400).json({ 
                success: false,
                message: "Missing email or password" 
            });
        }

        // Check if account exists
        if (!clientAccounts[email]) {
            console.log("❌ Account not found:", email);
            return res.status(401).json({ 
                success: false,
                message: "Account not found. Please contact support@holord.com" 
            });
        }

        const account = clientAccounts[email];
        
        // Check password
        if (account.password !== password) {
            console.log("❌ Wrong password for:", email);
            return res.status(401).json({ 
                success: false,
                message: "Incorrect password. Please contact support for assistance." 
            });
        }

        // Check subscription expiry
        const today = new Date();
        const expiryDate = new Date(account.expires);
        
        if (today > expiryDate) {
            console.log("❌ Subscription expired for:", email);
            return res.status(403).json({ 
                success: false,
                message: `Your subscription expired on ${account.expires}. Please contact support to renew.` 
            });
        }

        // Calculate days remaining
        const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                email: email,
                name: account.name,
                expires: account.expires 
            }, 
            process.env.JWT_SECRET || "holord_super_secret_key", 
            { expiresIn: "30d" }
        );

        console.log("✅ Login successful:", email);
        
        res.json({
            success: true,
            token,
            user: {
                email: email,
                name: account.name,
                expires: account.expires,
                daysRemaining: daysRemaining,
                plan: account.plan
            },
            message: `Welcome ${account.name}! Your subscription expires in ${daysRemaining} days.`
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ 
            success: false,
            message: "Server error. Please try again later." 
        });
    }
});

// 🚫 DISABLE PUBLIC SIGNUP - Only admin can create accounts
router.post("/signup", (req, res) => {
    res.status(403).json({
        success: false,
        message: "Account creation is by invitation only. Please contact sales@holord.com for access."
    });
});

// 👑 ADMIN ENDPOINT TO CREATE/MANAGE ACCOUNTS (Protected)
router.post("/create-account", (req, res) => {
    try {
        const { adminKey, email, password, name, months } = req.body;
        const ADMIN_KEY = process.env.ADMIN_KEY || "holord_admin_2024"; // Set this in .env
        
        // Verify admin key
        if (adminKey !== ADMIN_KEY) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid admin key"
            });
        }
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password required"
            });
        }

        // Check if email already exists
        if (clientAccounts[email]) {
            return res.status(400).json({
                success: false,
                message: "Account already exists"
            });
        }

        // Calculate expiry date
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + (months || 1));
        const expiryStr = expiryDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // Add to accounts (Note: This is in-memory only)
        clientAccounts[email] = {
            password: password,
            expires: expiryStr,
            name: name || "Client",
            plan: "monthly"
        };

        console.log(`✅ New account created: ${email}, expires: ${expiryStr}`);
        
        res.json({
            success: true,
            message: `Account created for ${email}`,
            details: {
                email: email,
                password: password, // Return password so admin can share with client
                name: name || "Client",
                expires: expiryStr,
                plan: "monthly"
            },
            note: "This account is stored in server memory. Add MONGO_URI for permanent storage."
        });

    } catch (error) {
        console.error("❌ Create account error:", error);
        res.status(500).json({
            success: false,
            message: "Server error creating account"
        });
    }
});

// 👑 ADMIN ENDPOINT TO VIEW ALL ACCOUNTS
router.get("/accounts", (req, res) => {
    try {
        const { adminKey } = req.query;
        const ADMIN_KEY = process.env.ADMIN_KEY || "holord_admin_2024";
        
        if (adminKey !== ADMIN_KEY) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid admin key"
            });
        }
        
        res.json({
            success: true,
            totalAccounts: Object.keys(clientAccounts).length,
            accounts: clientAccounts,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("❌ View accounts error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;