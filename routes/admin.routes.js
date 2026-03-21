import express from "express";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Feedback from "../models/Feedback.js";
import Room from "../models/Room.js";
import Internship from "../models/Internships.js";
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
      totalInternships,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: "seller" }),
      User.countDocuments({ role: "admin" }),
      Room.countDocuments(),
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: "new" }),
      Room.countDocuments({ isAvailable: true }),
      Internship.countDocuments(),
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
      totalInternships,
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
        { name:     { $regex: search, $options: "i" } },
        { email:    { $regex: search, $options: "i" } },
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

router.get("/rooms", ...isAdmin, async (req, res) => {
  try {
    const { search, type, isAvailable, page = 1, limit = 20 } = req.query;
    const query = {};
    if (type) query.type = type;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";
    if (search) {
      query.$or = [
        { title:    { $regex: search, $options: "i" } },
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

router.post("/rooms", ...isAdmin, async (req, res) => {
  try {
    const { title, description, type, rent, location, images, facilities, contactName, contactPhone } = req.body;

    if (!title || !type || !rent || !location)
      return res.status(400).json({ message: "title, type, rent, and location are required" });

    const room = await Room.create({
      title, description, type, rent, location,
      images: images || [],
      facilities: facilities || [],
      contactName, contactPhone,
      postedBy: req.user._id,
      isAvailable: true,
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: "Failed to create room" });
  }
});

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

router.delete("/rooms/:id", ...isAdmin, async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete room" });
  }
});

router.patch("/rooms/:id/availability", ...isAdmin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    room.isAvailable = !room.isAvailable;
    await room.save();
    res.json({
      message: `Room marked as ${room.isAvailable ? "available" : "unavailable"}`,
      isAvailable: room.isAvailable,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle availability" });
  }
});

// ════════════════════════════════════════
// 📬 FEEDBACK INBOX
// ════════════════════════════════════════

router.get("/feedback", ...isAdmin, async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type)   query.type   = type;
    if (search) {
      query.$or = [
        { title:       { $regex: search, $options: "i" } },
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

router.get("/feedback/:id", ...isAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate("userId", "name email profileImage branch year section");
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
});

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

router.delete("/feedback/:id", ...isAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });
    res.json({ message: "Feedback deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete feedback" });
  }
});

// ════════════════════════════════════════
// 💼 INTERNSHIPS
// ════════════════════════════════════════

// GET all internships — paginated, searchable, filterable by source
router.get("/internships", ...isAdmin, async (req, res) => {
  try {
    const { search, source, page = 1, limit = 20 } = req.query;
    const query = {};
    if (source) query.source = source;
    if (search) {
      query.$or = [
        { title:    { $regex: search, $options: "i" } },
        { company:  { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [internships, total] = await Promise.all([
      Internship.find(query).sort({ fetchedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Internship.countDocuments(query),
    ]);
    res.json({ internships, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch internships" });
  }
});

// POST /api/admin/internships/import — bulk upsert from JSON
router.post("/internships/import", ...isAdmin, async (req, res) => {
  try {
    const { jobs } = req.body;
    if (!Array.isArray(jobs) || !jobs.length)
      return res.status(400).json({ message: "jobs must be a non-empty array" });

    const ops = jobs.map(doc => ({
      updateOne: {
        filter: { externalId: doc.externalId },
        update: { $set: { ...doc, fetchedAt: new Date() } },
        upsert: true,
      },
    }));

    const result = await Internship.bulkWrite(ops, { ordered: false });

    res.json({
      inserted: result.upsertedCount,
      updated:  result.modifiedCount,
      total:    jobs.length,
    });
  } catch (err) {
    console.error("Internship import error:", err.message);
    res.status(500).json({ message: "Import failed", detail: err.message });
  }
});

// DELETE /api/admin/internships/source/:source — bulk delete all by source
// NOTE: must be defined BEFORE /:id to avoid route conflict
router.delete("/internships/source/:source", ...isAdmin, async (req, res) => {
  try {
    const result = await Internship.deleteMany({ source: req.params.source });
    res.json({ message: `Deleted ${result.deletedCount} listings`, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete" });
  }
});

// DELETE /api/admin/internships/:id — delete single listing
router.delete("/internships/:id", ...isAdmin, async (req, res) => {
  try {
    const item = await Internship.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete" });
  }
});


export default router;