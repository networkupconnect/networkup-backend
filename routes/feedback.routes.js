import express from "express";
import Feedback from "../models/Feedback.js";
import { annauth as auth } from "../middleware/auth.js";

const router = express.Router();

// ── POST — Submit feedback (any logged-in user) ──
router.post("/", auth, async (req, res) => {
  try {
    const { type, title, description } = req.body;

    if (!type || !title || !description)
      return res.status(400).json({ message: "type, title, and description are required" });

    const validTypes = ["bug", "feature", "suggestion", "other"];
    if (!validTypes.includes(type))
      return res.status(400).json({ message: `type must be one of: ${validTypes.join(", ")}` });

    const feedback = await Feedback.create({
      userId: req.user._id,
      type,
      title,
      description,
      status: "new",
    });

    res.status(201).json({ message: "Feedback submitted successfully", feedback });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

// ── GET — User sees their own submitted feedback ──
router.get("/my", auth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your feedback" });
  }
});

// ── DELETE — User deletes their own feedback (only if still "new") ──
router.delete("/:id", auth, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });

    if (feedback.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    if (feedback.status !== "new")
      return res.status(400).json({ message: "Cannot delete feedback that is already being reviewed" });

    await feedback.deleteOne();
    res.json({ message: "Feedback deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete feedback" });
  }
});

export default router;