import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "http";
import { Server } from "socket.io";

import passport from "./config/passport.js";
import connectDB from "./config/db.js";
import Message from "./models/Message.js";

import authRoutes from "./routes/auth.routes.js";
import sellerRoutes from "./routes/seller.routes.js";
import orderRoutes from "./routes/order.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import postRoutes from "./routes/post.routes.js";
// ✅ FIX: Corrected import path for chat routes
import chatRoutes from "./routes/chat.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import roomRoutes from "./routes/room.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import lostFoundRoutes from "./routes/lostfound.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import confessionRoutes from "./routes/confession.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import proxyRouter from "./routes/proxy.js";
// ✅ Connections routes
import connectionRoutes from "./routes/connection.routes.js";
import projectRoutes from "./routes/project.routes.js";
import targetsRouter from "./routes/targets.routes.js"
import jobsRouter from "./routes/internships.routes.js";



const app = express();

app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src":  ["'self'", "data:", "https://fonts.gstatic.com"],
    },
  },
}));

const allowedOrigins = [
  "https://networkup.in",
  // "https://networkup-frontend.vercel.app",
  // "http://localhost:5173",
];

// ✅ CORS before all routes
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feed", postRoutes);
app.use("/api/chat", chatRoutes); // Chat system
app.use("/api/connections", connectionRoutes); // Connection requests system
app.use("/api/projects", projectRoutes);       // Projects
app.use("/api/timetable", timetableRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/lostfound", lostFoundRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/confessions", confessionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", proxyRouter);
app.use("/api/targets", targetsRouter);
app.use("/api/internships", jobsRouter);
app.get("/", (req, res) => res.send("Backend running 🚀"));

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("user_online", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  socket.on("send_message", async ({ senderId, receiverId, text }) => {
    try {
      const conversationId = [senderId, receiverId].sort().join("_");
      const message = await Message.create({ conversationId, senderId, receiverId, text });
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) io.to(receiverSocket).emit("receive_message", message);
      socket.emit("message_sent", message);
    } catch (err) {
      console.error("Socket message error:", err);
    }
  });

  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) io.to(receiverSocket).emit("user_typing", { senderId });
  });

  socket.on("stop_typing", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) io.to(receiverSocket).emit("user_stop_typing", { senderId });
  });

  socket.on("disconnect", () => {
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit("online_users", Array.from(onlineUsers.keys()));
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => console.log(`Server running on ${PORT}`));
});