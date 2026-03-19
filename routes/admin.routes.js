import express from "express";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Feedback from "../models/Feedback.js";
import Room from "../models/Room.js";
import { annauth as auth, authorize } from "../middleware/auth.js";

const router = express.Router();
const isAdmin = [auth, authorize("admin")];

// ════════════════════════════════════════
// 📊 STATS
// ════════════════════════════════════════
router.get("/stats", ...isAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalSellers,
      totalAdmins,
      totalRooms,
      totalFeedbacks,
      newFeedbacks,
      availableRooms,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: "seller" }),
      User.countDocuments({ role: "admin" }),
      Room.countDocuments(),
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: "new" }),
      Room.countDocuments({ isAvailable: true }),
    ]);

    res.json({
      totalUsers,
      totalProducts,
      totalSellers,
      totalAdmins,
      totalRooms,
      totalFeedbacks,
      newFeedbacks,
      availableRooms,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// ════════════════════════════════════════
// 👤 USERS
// ════════════════════════════════════════
router.get("/users", ...isAdmin, async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).select("-password").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);
    res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Update any field on a user (admin-only power)
router.put("/users/:id", ...isAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: "Use /api/user/profile to update your own profile" });

    const forbidden = ["password", "_id", "__v"];
    forbidden.forEach((f) => delete req.body[f]);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Change role only
router.put("/users/:id/role", ...isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "seller", "admin"].includes(role))
      return res.status(400).json({ message: "Invalid role" });
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: "Cannot change your own role" });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
});

router.delete("/users/:id", ...isAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: "Cannot delete yourself" });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await Product.deleteMany({ sellerId: req.params.id });
    await Room.deleteMany({ postedBy: req.params.id });
    res.json({ message: "User and their listings deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// ════════════════════════════════════════
// 🛍️ PRODUCTS
// ════════════════════════════════════════
router.get("/products", ...isAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sellerId", "name email"),
      Product.countDocuments(query),
    ]);
    res.json({ products, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

router.delete("/products/:id", ...isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product" });
  }
});

// ════════════════════════════════════════
// 🏠 ROOMS  (Admin full control)
// ════════════════════════════════════════

// GET all rooms (paginated, searchable, filterable)
router.get("/rooms", ...isAdmin, async (req, res) => {
  try {
    const { search, type, isAvailable, page = 1, limit = 20 } = req.query;
    const query = {};
    if (type) query.type = type;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [rooms, total] = await Promise.all([
      Room.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("postedBy", "name email"),
      Room.countDocuments(query),
    ]);
    res.json({ rooms, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

// POST — Admin creates a room directly (postedBy = admin)
router.post("/rooms", ...isAdmin, async (req, res) => {
  try {
    const { title, description, type, rent, location, images, facilities, contactName, contactPhone } = req.body;

    if (!title || !type || !rent || !location)
      return res.status(400).json({ message: "title, type, rent, and location are required" });

    const room = await Room.create({
      title,
      description,
      type,
      rent,
      location,
      images: images || [],
      facilities: facilities || [],
      contactName,
      contactPhone,
      postedBy: req.user._id,   // admin is the poster
      isAvailable: true,
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: "Failed to create room" });
  }
});

// PUT — Admin edits any room
router.put("/rooms/:id", ...isAdmin, async (req, res) => {
  try {
    const forbidden = ["_id", "__v", "postedBy"];
    forbidden.forEach((f) => delete req.body[f]);

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("postedBy", "name email");

    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: "Failed to update room" });
  }
});

// DELETE — Admin deletes any room
router.delete("/rooms/:id", ...isAdmin, async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete room" });
  }
});

// PATCH — Toggle availability quickly
router.patch("/rooms/:id/availability", ...isAdmin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    room.isAvailable = !room.isAvailable;
    await room.save();
    res.json({ message: `Room marked as ${room.isAvailable ? "available" : "unavailable"}`, isAvailable: room.isAvailable });
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle availability" });
  }
});

// ════════════════════════════════════════
// 📬 FEEDBACK INBOX
// ════════════════════════════════════════

// GET all feedback (filterable by status/type)
router.get("/feedback", ...isAdmin, async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [feedbacks, total, newCount] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("userId", "name email profileImage"),
      Feedback.countDocuments(query),
      Feedback.countDocuments({ status: "new" }),
    ]);
    res.json({ feedbacks, total, newCount, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
});

// GET single feedback
router.get("/feedback/:id", ...isAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id).populate("userId", "name email profileImage branch year section");
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
});

// PATCH — Update status (in-review / resolved / dismissed)
router.patch("/feedback/:id/status", ...isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["new", "in-review", "resolved", "dismissed"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).populate("userId", "name email");

    if (!feedback) return res.status(404).json({ message: "Feedback not found" });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: "Failed to update feedback status" });
  }
});

// DELETE — Admin deletes feedback
router.delete("/feedback/:id", ...isAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });
    res.json({ message: "Feedback deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete feedback" });
  }
});



export default router;