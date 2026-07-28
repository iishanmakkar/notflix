const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cacheService = require('../utils/cache');

const DEV = process.env.NODE_ENV === "development";

exports.register = async (req, res) => {
  if (DEV) console.debug("🟢 [REGISTER] payload:", req.body);
  const { name, email, password } = req.body;

  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Cache user data
    const userData = { id: user._id, name: user.name, email: user.email, role: user.role, isPremium: false, profileImage: '' };
    await cacheService.cacheUser(user._id, userData);
    await cacheService.cacheAuthToken(token, userData);

    res.status(201).json({
      message: "Signup successful",
      user: userData,
      token,
    });
  } catch (err) {
    console.error("❌ [REGISTER] error:", err);
    res.status(500).json({ error: "Server error during signup" });
  }
};

exports.login = async (req, res) => {
  if (DEV) console.debug("🔵 [LOGIN] payload:", req.body);
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userData = { 
      id: user._id, 
      name: user.name, 
      email: user.email,
      role: user.role,
      isPremium: user.isPremium,
      profileImage: user.profileImage || ''
    };

    // Cache user data and auth token
    await cacheService.cacheUser(user._id, userData);
    await cacheService.cacheAuthToken(token, userData);

    res.status(200).json({
      message: "Login successful",
      user: userData,
      token,
    });
  } catch (err) {
    console.error("❌ [LOGIN] error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    // Check cache first
    const cachedUser = await cacheService.getCachedUser(req.user._id);
    if (cachedUser) {
      console.log(`📦 Cache hit for user: ${req.user._id}`);
      return res.status(200).json({ 
        user: cachedUser,
        _cached: true,
        _cachedAt: new Date().toISOString()
      });
    }

    const user = req.user;
    console.log('Current user data:', {
      id: user._id,
      name: user.name,
      role: user.role,
      isPremium: user.isPremium
    });
    
    if (!user) return res.status(404).json({ error: "User not found" });

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: user.isPremium,
      profileImage: user.profileImage || ''
    };

    // Cache user data
    await cacheService.cacheUser(req.user._id, userData);

    res.status(200).json({ 
      user: userData
    });
  } catch (err) {
    console.error('Error in getCurrentUser:', err);
    res.status(500).json({ error: "Server error fetching user" });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      // Invalidate auth token cache
      await cacheService.invalidateAuthToken(token);
    }

    // Invalidate user cache
    if (req.user) {
      await cacheService.invalidateUserCache(req.user._id);
    }

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.error('Error in logout:', err);
    res.status(500).json({ error: "Server error during logout" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const updateData = {};

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updateData.name = name.trim();
    }

    // If a profile image file is uploaded
    if (req.file) {
      const cloudinary = require("cloudinary").v2;
      const streamifier = require('streamifier');

      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "notflix/profiles",
            resource_type: "image",
            type: "upload",
            access_mode: "public",
          },
          (error, result) => error ? reject(error) : resolve(result)
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
      updateData.profileImage = uploadResult.secure_url;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select("_id name email role isPremium profileImage");

    await cacheService.invalidateUserCache(req.user._id);

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
        profileImage: user.profileImage
      }
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR >>>", err);
    res.status(500).json({ error: err.message || "Failed to update profile" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    await cacheService.invalidateUserCache(req.user._id);

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR >>>", err);
    res.status(500).json({ error: err.message || "Failed to change password" });
  }
};

// Middleware to validate cached auth token
exports.validateCachedToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Check cache first
    const cachedUser = await cacheService.getCachedAuthToken(token);
    if (cachedUser) {
      console.log(`📦 Cache hit for auth token`);
      req.user = cachedUser.id;
      return next();
    }

    // If not in cache, verify with JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id || decoded.userId;
    
    // Cache the token for future requests
    const user = await User.findById(req.user).select("name email _id isPremium role");
    if (user) {
      const userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
        profileImage: user.profileImage || ''
      };
      await cacheService.cacheAuthToken(token, userData);
    }

    next();
  } catch (err) {
    console.error('Token validation error:', err);
    res.status(401).json({ error: "Invalid token" });
  }
};
