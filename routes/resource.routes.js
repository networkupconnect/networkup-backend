import express from "express";
import Resource from "../models/Resource.js";
import { annauth as protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/my", protect, async (req, res) => {
  try {
    const { branch, year, section } = req.user;
    const { type } = req.query;

    if (!branch || !year) {
      return res.status(400).json({ message: "Please complete your profile with branch and year" });
    }

    const filter = {
      branch,
      year,
      $or: [{ section: "all" }, { section: section || "all" }],
    };

    if (type) filter.type = type;

    const resources = await Resource.find(filter)
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name")
      .lean();

    res.json(resources);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch resources" });
  }
});

router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    // ✅ Added `unit` to destructuring
    const { title, description, type, branch, year, section, subject, unit } = req.body;

    if (!title || !type || !branch || !year || !subject) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please upload a file" });
    }

    const resource = await Resource.create({
      title,
      description,
      type,
      branch,
      year: Number(year),
      section: section || "all",
      subject,
      unit: unit || "General", // ✅ Added unit field
      fileUrl: req.file.path,
      uploadedBy: req.user._id,
    });

    res.status(201).json(resource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload resource" });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete" });
  }
});

export default router;