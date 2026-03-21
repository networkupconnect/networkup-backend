import express from "express";
import LostFound from "../models/LostFound.js";
import { annauth as protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

/* ── optional auth middleware ─────────────────────────────────────────────
   Attaches req.user if a valid token is present, but never rejects the
   request — so public browsing still works without a token.
──────────────────────────────────────────────────────────────────────────── */
const optionalAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return next();
  // reuse the same protect logic but swallow any auth errors
  protect(req, res, (err) => next()); // if token invalid, req.user stays undefined
};

router.get("/", optionalAuth, async (req, res) => {
  try {
    const { type, category, location, mine } = req.query;
    const filter = {};

    if (mine === "true") {
      // requires login — return 401 if somehow called without auth
      if (!req.user) return res.status(401).json({ message: "Login required" });
      filter.postedBy = req.user._id;
    } else if (type) {
      filter.type = type;
    }

    if (category) filter.category = category;
    if (location)  filter.location  = location;

    const items = await LostFound.find(filter)
      .sort({ createdAt: -1 })
      .populate("postedBy", "name profileImage")
      .lean();

    res.json(items);
  } catch (err) {
    console.error("GET LOSTFOUND:", err.message);
    res.status(500).json({ message: "Failed" });
  }
});

router.post("/", protect, upload.array("images", 3), async (req, res) => {
  try {
    const { type, title, description, category, location, date, contactInfo, reward } = req.body;
    const images = req.files ? req.files.map(f => f.path) : [];
    const item = await LostFound.create({
      type, title, description, category, location,
      date: date ? new Date(date) : null,
      images, contactInfo,
      reward: reward ? Number(reward) : null,
      postedBy: req.user._id,
    });
    await item.populate("postedBy", "name profileImage");
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to post" });
  }
});

router.patch("/:id/resolve", protect, async (req, res) => {
  try {
    const item = await LostFound.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    if (item.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not your post" });
    item.resolved = true;
    await item.save();
    res.json(item);
  } catch { res.status(500).json({ message: "Failed" }); }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const item = await LostFound.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    if (item.postedBy.toString() !== req.user._id.toString() && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized" });
    await LostFound.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch { res.status(500).json({ message: "Failed" }); }
});

export default router;