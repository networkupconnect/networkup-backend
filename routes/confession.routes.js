import express from "express";
import Confession from "../models/Confession.js";
import { annauth as protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// GET all — never expose postedBy
router.get("/", async (req, res) => {
  try {
    const { tag, sort } = req.query;
    const filter = {};
    if (tag) filter.tag = tag;
    const sortObj = sort === "popular" ? { likes: -1 } : { createdAt: -1 };
    const confessions = await Confession.find(filter)
      .sort(sortObj)
      .select("-postedBy") // ✅ never expose who posted
      .lean();
    res.json(confessions);
  } catch { res.status(500).json({ message: "Failed" }); }
});

// POST — requires login but identity hidden from others
router.post("/", protect, async (req, res) => {
  try {
    const { text, tag } = req.body;
    if (!text || text.trim().length < 10)
      return res.status(400).json({ message: "Too short" });
    const confession = await Confession.create({
      text: text.trim(), tag: tag || "",
      postedBy: req.user._id, // stored for moderation, never exposed
    });
    // return without postedBy
    const safe = confession.toObject();
    delete safe.postedBy;
    res.status(201).json(safe);
  } catch { res.status(500).json({ message: "Failed" }); }
});

// PATCH like — no auth needed
router.patch("/:id/like", async (req, res) => {
  try {
    const c = await Confession.findByIdAndUpdate(
      req.params.id, { $inc: { likes: 1 } }, { new: true }
    ).select("-postedBy");
    res.json(c);
  } catch { res.status(500).json({ message: "Failed" }); }
});

// DELETE — admin only
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Confession.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch { res.status(500).json({ message: "Failed" }); }
});

export default router;