const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { adminMiddleware } = require("../middlewares/adminMiddleware");
const { register, login, getCurrentUser, updateProfile, changePassword } = require("../controllers/authController");
const { rateLimits } = require("../middlewares/rateLimit");
const router = express.Router();
const passport = require("passport");
require("../passport/google");
const User = require("../models/User");
const tokenStore = require("../utils/tokenStore");
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const { isGoogleAuthConfigured } = require("../passport/google");

// Google OAuth routes
router.get("/google", rateLimits.public, (req, res, next) => {
  if (!isGoogleAuthConfigured) return res.status(503).json({ error: "Google sign-in is not configured" });
  return passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/google/callback",
  rateLimits.public,
  (req, res, next) => {
    if (!isGoogleAuthConfigured) return res.status(503).json({ error: "Google sign-in is not configured" });
    return next();
  },
  passport.authenticate("google", {
    successRedirect: process.env.FRONTEND_URL || "http://localhost:5173/",
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
  })
);

// Auth routes
router.post("/logout", rateLimits.auth, async (req, res) => {
  const authHeader = req.header("Authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(400).json({ error: "Token not provided" });
  }

  try {
    // Optional: decode token to get expiry time
    const decoded = jwt.decode(token);
    const exp = decoded.exp; // in seconds

    // Calculate TTL
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    if (ttl > 0) {
      await tokenStore.setEx(`blacklist_${token}`, ttl, "true");
    }

    return res.status(200).json({ message: "Logout successful and token blacklisted" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", authMiddleware, getCurrentUser);

// Login route
router.post("/login", rateLimits.auth, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: user.isPremium,
      profileImage: user.profileImage || ''
    };

    res.json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// Register route
router.post("/register", rateLimits.auth, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    if (typeof name !== "string" || name.trim().length < 2 || typeof email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(email) || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Provide a valid name, email, and password of at least 8 characters" });
    }

    // Check if user exists
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user (password will be hashed by the pre-save middleware)
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "user" // Default role
    });

    await user.save();
    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: user.isPremium,
      profileImage: user.profileImage || ''
    };

    res.status(201).json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// Update user premium status
router.patch("/update-premium", rateLimits.admin, authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, isPremium } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    console.log("Updating premium status:", {
      userId,
      isPremium,
      currentTime: new Date().toISOString()
    });

    if (typeof isPremium !== "boolean") {
      return res.status(400).json({ message: "isPremium must be a boolean" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isPremium: isPremium },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Updated user premium status:", {
      userId: user._id,
      name: user.name,
      email: user.email,
      isPremium: user.isPremium,
      updatedAt: new Date().toISOString()
    });

    res.json({
      message: "Premium status updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
        profileImage: user.profileImage || ''
      }
    });
  } catch (error) {
    console.error("Error updating premium status:", error);
    res.status(500).json({ message: "Server error updating premium status" });
  }
});

// Profile update route
const { uploadImage } = require("../middlewares/upload");
router.put("/update-profile", rateLimits.auth, authMiddleware, async (req, res, next) => {
  uploadImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "File upload error" });
    }
    updateProfile(req, res, next);
  });
});

// Change password route
router.put("/change-password", rateLimits.auth, authMiddleware, changePassword);

module.exports = router;

// const express = require("express");
// const authMiddleware = require("../middlewares/authMiddleware");
// const { register, login, getCurrentUser } = require("../controllers/authController");
// const router = express.Router();
// const passport = require("passport");
// require("../passport/google");

// router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// router.get("/me", authMiddleware, async (req, res) => {
//   try {
//     const user = await User.findById(req.user).select("name email");
//     if (!user) return res.status(404).json({ error: "User not found" });
//     res.json({ user });
//   } catch (err) {
//     console.error("❌ [AUTH/ME] Error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// router.get(
//   "/google/callback",
//   passport.authenticate("google", {
//     successRedirect: "http://localhost:5173/", // 
//     failureRedirect: "http://localhost:3000/login",
//   })
// );

// router.post("/signup", register);
// router.post("/login", login);

// module.exports = router;
