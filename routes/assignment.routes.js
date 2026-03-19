import express from "express";
import Assignment from "../models/Assignment.js";
import { annauth as protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// GET all open assignments
router.get("/", protect, async (req, res) => {
  try {
    const { subject, status = "open", sort = "newest" } = req.query;
    const filter = { status };
    if (subject) filter.subject = subject;

    const sortObj = sort === "budget_high" ? { budget: -1 }
      : sort === "budget_low" ? { budget: 1 }
      : sort === "deadline" ? { deadline: 1 }
      : { createdAt: -1 };

    const assignments = await Assignment.find(filter)
      .sort(sortObj)
      .populate("postedBy", "name profileImage")
      .populate("assignedTo", "name profileImage")
      .lean();
    res.json(assignments);
  } catch {
    res.status(500).json({ message: "Failed to fetch" });
  }
});

// GET my posted assignments
router.get("/my-posts", protect, async (req, res) => {
  try {
    const assignments = await Assignment.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name profileImage")
      .lean();
    res.json(assignments);
  } catch {
    res.status(500).json({ message: "Failed" });
  }
});

// GET my taken assignments
router.get("/my-work", protect, async (req, res) => {
  try {
    const assignments = await Assignment.find({ assignedTo: req.user._id })
      .sort({ createdAt: -1 })
      .populate("postedBy", "name profileImage")
      .lean();
    res.json(assignments);
  } catch {
    res.status(500).json({ message: "Failed" });
  }
});

// GET single assignment
router.get("/:id", protect, async (req, res) => {
  try {
    const a = await Assignment.findById(req.params.id)
      .populate("postedBy", "name profileImage")
      .populate("assignedTo", "name profileImage")
      .populate("bids.userId", "name profileImage");
    if (!a) return res.status(404).json({ message: "Not found" });
    res.json(a);
  } catch {
    res.status(500).json({ message: "Failed" });
  }
});

// POST create assignment
router.post("/", protect, upload.array("attachments", 3), async (req, res) => {
  try {
    const { title, description, subject, budget, deadline, tags } = req.body;
    const attachments = req.files ? req.files.map(f => f.path) : [];
    const tagList = tags ? (Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim())) : [];

    const assignment = await Assignment.create({
      title, description, subject,
      budget: Number(budget),
      deadline: new Date(deadline),
      attachments, tags: tagList,
      postedBy: req.user._id,
    });

    await assignment.populate("postedBy", "name profileImage");
    res.status(201).json(assignment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to post" });
  }
});

// POST place a bid
router.post("/:id/bid", protect, async (req, res) => {
  try {
    const { amount, message } = req.body;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) return res.status(404).json({ message: "Not found" });
    if (assignment.status !== "open") return res.status(400).json({ message: "Assignment is not open" });
    if (assignment.postedBy.toString() === req.user._id.toString())
      return res.status(400).json({ message: "Cannot bid on your own assignment" });

    // remove old bid if any
    assignment.bids = assignment.bids.filter(
      b => b.userId.toString() !== req.user._id.toString()
    );
    assignment.bids.push({ userId: req.user._id, amount: Number(amount), message });
    await assignment.save();
    await assignment.populate("bids.userId", "name profileImage");
    res.json(assignment);
  } catch {
    res.status(500).json({ message: "Failed to bid" });
  }
});

// POST accept a bid
router.post("/:id/accept/:userId", protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Not found" });
    if (assignment.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not your assignment" });

    const bid = assignment.bids.find(b => b.userId.toString() === req.params.userId);
    if (!bid) return res.status(404).json({ message: "Bid not found" });

    assignment.status = "assigned";
    assignment.assignedTo = req.params.userId;
    assignment.acceptedBid = bid.amount;
    await assignment.save();
    res.json(assignment);
  } catch {
    res.status(500).json({ message: "Failed to accept" });
  }
});

// PATCH mark as completed
router.patch("/:id/complete", protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Not found" });
    if (assignment.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not your assignment" });
    assignment.status = "completed";
    await assignment.save();
    res.json(assignment);
  } catch {
    res.status(500).json({ message: "Failed" });
  }
});

// DELETE assignment
router.delete("/:id", protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Not found" });
    if (assignment.postedBy.toString() !== req.user._id.toString() && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized" });
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Failed" });
  }
});

export default router;