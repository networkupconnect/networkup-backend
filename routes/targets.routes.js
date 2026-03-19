import express from "express";
import Target from "../models/Target.js";
import { annauth as protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────────────────

// GET /api/targets/recent — targets with at least 1 progress, for home feed
router.get("/recent", async (req, res) => {
  try {
    const all = await Target.find()
      .sort({ updatedAt: -1 })
      .limit(60)
      .populate("author", "name username profileImage")
      .lean();
    res.json(all.filter(t => t.progress?.length > 0).slice(0, 20));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch targets" });
  }
});

// GET /api/targets/user/:userId
router.get("/user/:userId", async (req, res) => {
  try {
    const targets = await Target.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(targets);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch targets" });
  }
});

// ── Protected ──────────────────────────────────────────────────────────────

// POST /api/targets — create target
router.post("/", protect, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    const target = await Target.create({ author: req.user._id, title: title.trim() });
    await target.populate("author", "name username profileImage");
    res.status(201).json(target);
  } catch (err) {
    res.status(500).json({ message: "Failed to create target" });
  }
});

// DELETE /api/targets/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const target = await Target.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "Not found" });
    if (target.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorised" });
    await target.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete target" });
  }
});

// POST /api/targets/:id/progress — add progress update
router.post("/:id/progress", protect, upload.single("image"), async (req, res) => {
  try {
    const target = await Target.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "Not found" });
    if (target.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorised" });

    const { text = "", link = "", isCompletion } = req.body;
    const image = req.file?.path || "";
    const completing = isCompletion === "true";

    target.progress.push({ text, image, link, isCompletion: completing });
    if (completing) target.isCompleted = true;

    await target.save();
    res.json(target);
  } catch (err) {
    res.status(500).json({ message: "Failed to add progress" });
  }
});

// DELETE /api/targets/:id/progress/:progressId
router.delete("/:id/progress/:progressId", protect, async (req, res) => {
  try {
    const target = await Target.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "Not found" });
    if (target.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorised" });

    target.progress = target.progress.filter(p => p._id.toString() !== req.params.progressId);
    if (!target.progress.some(p => p.isCompletion)) target.isCompleted = false;

    await target.save();
    res.json(target);
  } catch (err) {
    res.status(500).json({ message: "Failed to delete progress" });
  }
});

// POST /api/targets/:id/rate
router.post("/:id/rate", protect, async (req, res) => {
  try {
    const stars = Number(req.body.stars);
    if (!stars || stars < 1 || stars > 5)
      return res.status(400).json({ message: "Stars must be 1–5" });
    const target = await Target.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "Not found" });
    const idx = target.ratings.findIndex(r => r.userId?.toString() === req.user._id.toString());
    if (idx >= 0) target.ratings[idx].stars = stars;
    else target.ratings.push({ userId: req.user._id, stars });
    await target.save();
    res.json({ ratings: target.ratings });
  } catch (err) {
    res.status(500).json({ message: "Failed to rate" });
  }
});

export default router;