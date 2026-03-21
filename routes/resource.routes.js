import express from "express";
import Resource from "../models/Resource.js";
import { annauth as protect } from "../middleware/auth.js";

const router = express.Router();

/* ── GET /api/resources/all ─────────────────────────────────────────────────
   Public — no auth. Optional ?type= filter.
   Must be BEFORE /:id routes.
────────────────────────────────────────────────────────────────────────────── */
router.get("/all", async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;

    const resources = await Resource.find(filter)
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name")
      .lean();

    res.json(resources);
  } catch (err) {
    console.error("GET /resources/all:", err.message);
    res.status(500).json({ message: "Failed to fetch resources" });
  }
});

/* ── POST /api/resources ─────────────────────────────────────────────────── */
router.post("/", protect, async (req, res) => {
  try {
    const { title, description, type, subject, unit, lectureLink, notesLink } = req.body;

    if (!title?.trim())   return res.status(400).json({ message: "Title is required" });
    if (!type)            return res.status(400).json({ message: "Type is required" });
    if (!subject?.trim()) return res.status(400).json({ message: "Subject is required" });
    if (!lectureLink?.trim() && !notesLink?.trim())
      return res.status(400).json({ message: "At least one link is required" });

    const resource = await Resource.create({
      title:       title.trim(),
      description: (description || "").trim(),
      type,
      subject:     subject.trim(),
      unit:        (unit || "General").trim(),
      lectureLink: (lectureLink || "").trim(),
      notesLink:   (notesLink   || "").trim(),
      uploadedBy:  req.user._id,
    });

    res.status(201).json(resource);
  } catch (err) {
    console.error("POST /resources:", err.message);
    res.status(500).json({ message: "Failed to save resource" });
  }
});

/* ── PATCH /api/resources/:id ────────────────────────────────────────────────
   Anyone logged in can edit (collaborative model).
   Only updates the fields that are sent — partial update is fine.
────────────────────────────────────────────────────────────────────────────── */
router.patch("/:id", protect, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Not found" });

    const { title, description, subject, unit, lectureLink, notesLink } = req.body;

    // Only update fields that are explicitly provided
    if (title       !== undefined) resource.title       = title.trim();
    if (description !== undefined) resource.description = description.trim();
    if (subject     !== undefined) resource.subject     = subject.trim();
    if (unit        !== undefined) resource.unit        = unit.trim();
    if (lectureLink !== undefined) resource.lectureLink = lectureLink.trim();
    if (notesLink   !== undefined) resource.notesLink   = notesLink.trim();

    await resource.save();

    // Re-populate for response
    await resource.populate("uploadedBy", "name");
    res.json(resource);
  } catch (err) {
    console.error("PATCH /resources/:id:", err.message);
    res.status(500).json({ message: "Failed to update resource" });
  }
});

/* ── DELETE /api/resources/:id ───────────────────────────────────────────────
   Only the uploader or an admin can delete.
────────────────────────────────────────────────────────────────────────────── */
router.delete("/:id", protect, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Not found" });

    const isOwner = resource.uploadedBy?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Not authorized" });

    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /resources/:id:", err.message);
    res.status(500).json({ message: "Failed to delete" });
  }
});

export default router;