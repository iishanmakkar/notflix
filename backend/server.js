require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]); // Workaround for Windows MongoDB SRV ECONNREFUSED issues

const compression = require("compression");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const passport = require("passport");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");

const jwt = require("jsonwebtoken");

const { validateEnvironment } = require("./config/env");
const redisClient = require("./config/redis");
const cacheService = require("./utils/cache");
const logger = require("./utils/logger");
require("./utils/cloudinary");
const { supabase } = require("./utils/supabaseClient");
// const User = require("./models/User"); // User model now via Supabase
const { authMiddleware } = require("./middlewares/authMiddleware");
const { findUserById } = require("./utils/db");
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

const morganFormat = isProduction ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

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
    const user = await findUserById(decoded.userId);
    if (!user) return next(new Error("Authentication token is not valid"));

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
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room", room)
        .order("timestamp", { ascending: true })
        .limit(50);

      if (error) throw error;

      const normMessages = (messages || []).map(msg => ({ ...msg, _id: msg.id }));
      socket.emit("room_messages", normMessages);
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
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          content,
          room: messageData.room,
          sender: socket.user.id || socket.user._id,
          senderName: socket.user.name,
          isAdmin: socket.user.role === "admin",
        })
        .select()
        .single();

      if (error) throw error;

      const normMessage = { ...message, _id: message.id };
      await cacheService.invalidateChatCache(messageData.room);
      io.to(messageData.room).emit("receive_message", normMessage);
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
  if (status >= 500) logger.error(err);
  res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
});

let server;
async function start() {
  await redisClient.connect();
  // Start listening on the port provided by Railway or fallback to 5000
  server = httpServer.listen(PORT, () => logger.info(`Notflix API listening on port ${PORT}`));

  if (isProduction) {
    cron.schedule("0 */6 * * *", () => cacheService.warmNotesCache().catch(err => logger.error(err)));
  }

}

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  if (server) server.close();
  // No mongoose connection to close
  await redisClient.disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((error) => {
  logger.error("Unable to start Notflix API", error);
  process.exit(1);
});
