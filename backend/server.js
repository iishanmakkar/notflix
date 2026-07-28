require("dotenv").config();

const compression = require("compression");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const passport = require("passport");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const { validateEnvironment } = require("./config/env");
const redisClient = require("./config/redis");
const cacheService = require("./utils/cache");
require("./utils/cloudinary");
const Message = require("./models/chatModel");
const User = require("./models/User");
const { authMiddleware } = require("./middlewares/authMiddleware");
const { adminMiddleware } = require("./middlewares/adminMiddleware");

const noteRoutes = require("./routes/noteRoutes");
const authRoutes = require("./routes/authRoutes");
const googleAuthRoutes = require("./routes/googleAuthRoutes");
const chatRoutes = require("./routes/chatRoutes");
const ocrRoutes = require("./routes/ocrRoutes");
const rateLimitRoutes = require("./routes/rateLimitRoutes");
const contactRoutes = require("./routes/contactRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const healthRoutes = require("./routes/healthRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

validateEnvironment();
require("./passport/google");

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = new Set(
  [process.env.FRONTEND_URL, !isProduction && "http://localhost:5173"].filter(Boolean)
);

function validateOrigin(origin, callback) {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error("Origin is not allowed by CORS"));
}

const io = new Server(httpServer, {
  cors: {
    origin: validateOrigin,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
  },
});

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cors({
  origin: validateOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (_req, res) => res.json({ service: "notflix-api", status: "ok" }));

app.use("/api/notes", noteRoutes);
app.use("/api/auth", authRoutes);
app.use("/auth", googleAuthRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/rate-limit", rateLimitRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);

app.get("/api/cache/health", authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const health = await cacheService.healthCheck();
    const stats = await cacheService.getCacheStats();
    res.json({ health, stats });
  } catch (error) {
    next(error);
  }
});

app.get("/api/cache/stats", authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    res.json(await cacheService.getCacheStats());
  } catch (error) {
    next(error);
  }
});

app.post("/api/cache/clear", authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const pattern = typeof req.body.pattern === "string" ? req.body.pattern : "*";
    await cacheService.deletePattern(pattern);
    res.json({ message: `Cache cleared for pattern: ${pattern}` });
  } catch (error) {
    next(error);
  }
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication token not provided"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("_id name role");
    if (!user) return next(new Error("User not found"));

    socket.user = user;
    return next();
  } catch (_error) {
    return next(new Error("Authentication failed"));
  }
});

const validRooms = new Set(["general", "doubt", "community", "reviews"]);
io.on("connection", (socket) => {
  socket.on("join_room", async (room) => {
    if (!validRooms.has(room)) return socket.emit("error", "Invalid chat room");
    try {
      socket.join(room);
      const messages = await Message.find({ room })
        .sort({ timestamp: 1 })
        .limit(50)
        .populate("sender", "name");
      socket.emit("room_messages", messages);
    } catch (_error) {
      socket.emit("error", "Failed to join room");
    }
  });

  socket.on("send_message", async (messageData = {}) => {
    const content = typeof messageData.content === "string" ? messageData.content.trim() : "";
    if (!validRooms.has(messageData.room) || !content || content.length > 1000) {
      return socket.emit("error", "Invalid message");
    }

    try {
      const message = await Message.create({
        content,
        room: messageData.room,
        sender: socket.user._id,
        senderName: socket.user.name,
        isAdmin: socket.user.role === "admin",
      });
      await cacheService.invalidateChatCache(messageData.room);
      io.to(messageData.room).emit("receive_message", message);
    } catch (_error) {
      socket.emit("error", "Failed to send message");
    }
  });
});

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, _req, res, _next) => {
  const status = err.name === "MulterError" || err.name === "ValidationError" || err.name === "CastError"
    ? 400
    : err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
});

let server;
async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  await redisClient.connect();

  if (isProduction) {
    cron.schedule("0 */6 * * *", () => cacheService.warmNotesCache().catch(console.error));
  }

  server = httpServer.listen(PORT, () => console.log(`Notflix API listening on port ${PORT}`));
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  if (server) server.close();
  await mongoose.disconnect();
  await redisClient.disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((error) => {
  console.error("Unable to start Notflix API", error);
  process.exit(1);
});
