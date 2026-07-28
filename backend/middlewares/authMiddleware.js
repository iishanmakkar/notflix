const jwt = require("jsonwebtoken");
const User = require("../models/User");
const tokenStore = require("../utils/tokenStore");
const cacheService = require("../utils/cache");

const authMiddleware = async (req, res, next) => {
  const [scheme, token] = (req.header("Authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication is required" });
  }

  try {
    if (await tokenStore.get(`blacklist_${token}`)) {
      return res.status(401).json({ error: "Authentication token has been invalidated" });
    }

    // Check cache first
    const cachedUser = await cacheService.getCachedAuthToken(token);
    if (cachedUser) {
      req.user = {
        _id: cachedUser.id,
        name: cachedUser.name,
        email: cachedUser.email,
        role: cachedUser.role,
        isPremium: cachedUser.isPremium,
        profileImage: cachedUser.profileImage || ''
      };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("_id name email role isPremium profileImage");
    if (!user) return res.status(401).json({ error: "Authentication token is not valid" });

    // Cache for future requests
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: user.isPremium,
      profileImage: user.profileImage || ''
    };
    await cacheService.cacheAuthToken(token, userData);

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Authentication token is not valid" });
  }
};

module.exports = { authMiddleware };
