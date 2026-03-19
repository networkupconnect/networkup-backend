import express from "express";
import Project from "../models/Project.js";
import { annauth as protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────
function parseTags(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw); }
  catch { return Array.isArray(raw) ? raw : [raw]; }
}

// ── Public ─────────────────────────────────────────────────────────────────

// GET /api/projects/recent — for home feed
router.get("/recent", async (req, res) => {
  try {
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("author", "name username profileImage")
      .lean();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

// GET /api/projects/user/:userId
router.get("/user/:userId", async (req, res) => {
  try {
    const projects = await Project.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("author", "name username profileImage")
      .lean();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

// GET /api/projects/:id
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("author", "name username profileImage")
      .lean();
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

// ── Protected ──────────────────────────────────────────────────────────────

// POST /api/projects
router.post("/", protect, upload.array("coverImages", 3), async (req, res) => {
  try {
    const { title, tagline, description, liveUrl, repoUrl, ytUrl, status } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });

    const tags = parseTags(req.body.tags);
    const coverImages = req.files?.map(f => f.path) || [];

    const project = await Project.create({
      author: req.user._id,
      title: title.trim(),
      tagline: tagline?.trim() || "",
      description: description || "",
      tags,
      liveUrl: liveUrl?.trim() || "",
      repoUrl: repoUrl?.trim() || "",
      ytUrl: ytUrl?.trim() || "",
      coverImages,
      coverImage: coverImages[0] || "",
      status: status || "in-progress",
    });

    await project.populate("author", "name username profileImage");
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create project" });
  }
});

// PUT /api/projects/:id
router.put("/:id", protect, upload.array("coverImages", 3), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorised" });

    const fields = ["title", "tagline", "description", "liveUrl", "repoUrl", "ytUrl", "status"];
    fields.forEach(f => { if (req.body[f] !== undefined) project[f] = req.body[f]; });

    if (req.body.tags) project.tags = parseTags(req.body.tags);
    if (req.files?.length) {
      project.coverImages = req.files.map(f => f.path);
      project.coverImage = project.coverImages[0];
    }

    await project.save();
    await project.populate("author", "name username profileImage");
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: "Failed to update project" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorised" });
    await project.deleteOne();
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete project" });
  }
});

// POST /api/projects/:id/like
router.post("/:id/like", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    const uid = req.user._id.toString();
    if (project.likes.map(l => l.toString()).includes(uid)) project.likes.pull(req.user._id);
    else project.likes.addToSet(req.user._id);
    await project.save();
    res.json({ likes: project.likes });
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle like" });
  }
});

// POST /api/projects/:id/rate
router.post("/:id/rate", protect, async (req, res) => {
  try {
    const stars = Number(req.body.stars);
    if (!stars || stars < 1 || stars > 5)
      return res.status(400).json({ message: "Stars must be 1–5" });
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    const idx = project.ratings.findIndex(r => r.userId?.toString() === req.user._id.toString());
    if (idx >= 0) project.ratings[idx].stars = stars;
    else project.ratings.push({ userId: req.user._id, stars });
    await project.save();
    res.json({ ratings: project.ratings });
  } catch (err) {
    res.status(500).json({ message: "Failed to rate" });
  }
});

export default router;