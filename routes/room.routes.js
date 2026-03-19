import express from "express";
import Room from "../models/Room.js";
import { annauth as auth, requireProfileComplete } from "../middleware/auth.js";
import upload from "../middleware/upload.js"; // ← your existing multer instance

const router = express.Router();

// ── GET all rooms (public) ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { type, search, minRent, maxRent, facilities, page = 1, limit = 20 } = req.query;

    const query = { isAvailable: true };
    if (type) query.type = type;

    if (search) {
      query.$or = [
        { title:    { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    if (minRent || maxRent) {
      query.rent = {};
      if (minRent) query.rent.$gte = Number(minRent);
      if (maxRent) query.rent.$lte = Number(maxRent);
    }

    // facilities filter: listing must contain ALL requested facilities
    if (facilities) {
      const arr = facilities.split(",").map((f) => f.trim()).filter(Boolean);
      if (arr.length) query.facilities = { $all: arr };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [rooms, total] = await Promise.all([
      Room.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("postedBy", "name profileImage"),
      Room.countDocuments(query),
    ]);

    res.json({ rooms, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error("GET ROOMS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

// ── GET single room (public) ────────────────────────────────────────────────
router.get("/my/listings", auth, async (req, res) => {
  try {
    const rooms = await Room.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate("postedBy", "name profileImage");
    res.json(rooms);
  } catch (err) {
    console.error("GET MY LISTINGS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch your listings" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate("postedBy", "name profileImage email");
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch room" });
  }
});

// ── POST — create listing ───────────────────────────────────────────────────
// ✅ upload.array("images", 5) MUST come before body is read
router.post(
  "/",
  auth,
  requireProfileComplete,
  upload.array("images", 5),          // ← parses multipart/form-data
  async (req, res) => {
    try {
      const { title, description, type, rent, location, contactName, contactPhone } = req.body;

      // req.body fields come from FormData after multer parses them
      if (!title || !type || !rent || !location) {
        return res.status(400).json({ message: "title, type, rent and location are required" });
      }

      // facilities[] may come as a comma-joined string or repeated keys
      let facilities = [];
      if (req.body.facilities) {
        facilities = Array.isArray(req.body.facilities)
          ? req.body.facilities
          : req.body.facilities.split(",").map((f) => f.trim()).filter(Boolean);
      }

      // uploaded image paths / URLs (depends on your multer storage config)
      const images = (req.files || []).map((f) =>
        // if using cloudinary / memoryStorage you may need a different field
        f.path || f.location || f.filename
      );

      const room = await Room.create({
        title:        title.trim(),
        description:  description?.trim() || "",
        type,
        rent:         Number(rent),
        location:     location.trim(),
        facilities,
        images,
        contactName:  contactName?.trim() || "",
        contactPhone: contactPhone?.trim() || "",
        postedBy:     req.user._id,
      });

      // populate postedBy so the frontend card renders immediately
      await room.populate("postedBy", "name profileImage");

      res.status(201).json(room);
    } catch (err) {
      console.error("POST ROOM ERROR:", err);
      res.status(500).json({ message: err.message || "Failed to create room" });
    }
  }
);

// ── PUT — edit own room ─────────────────────────────────────────────────────
router.put(
  "/:id",
  auth,
  requireProfileComplete,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) return res.status(404).json({ message: "Room not found" });

      const isOwner = room.postedBy.toString() === req.user._id.toString();
      if (!isOwner && req.user.role !== "admin")
        return res.status(403).json({ message: "Not authorized" });

      const forbidden = ["_id", "__v", "postedBy"];
      forbidden.forEach((f) => delete req.body[f]);

      if (req.files?.length) {
        req.body.images = req.files.map((f) => f.path || f.location || f.filename);
      }

      if (req.body.facilities && !Array.isArray(req.body.facilities)) {
        req.body.facilities = req.body.facilities.split(",").map((f) => f.trim()).filter(Boolean);
      }

      const updated = await Room.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).populate("postedBy", "name profileImage");

      res.json(updated);
    } catch (err) {
      console.error("PUT ROOM ERROR:", err);
      res.status(500).json({ message: "Failed to update room" });
    }
  }
);

// ── DELETE ──────────────────────────────────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isOwner = room.postedBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized" });

    await room.deleteOne();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE ROOM ERROR:", err);
    res.status(500).json({ message: "Failed to delete room" });
  }
});

export default router;