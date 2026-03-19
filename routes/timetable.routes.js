import express from "express";
import Timetable from "../models/Timetable.js";
import { annauth as protect } from "../middleware/auth.js";

const router = express.Router();

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// GET timetable for logged-in student (uses their branch/year/section)
router.get("/my", protect, async (req, res) => {
  try {
    const { branch, year, section } = req.user;

    if (!branch || !year || !section) {
      return res.status(400).json({ message: "Please complete your profile with branch, year and section" });
    }

    const timetable = await Timetable.find({ branch, year, section })
      .sort({ day: 1 })
      .lean();

    // Return all days in order, empty slots if no class
    const result = DAYS.map((day) => {
      const found = timetable.find((t) => t.day === day);
      return { day, slots: found?.slots || [] };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch timetable" });
  }
});

// GET timetable by branch/year/section (public/admin)
router.get("/:branch/:year/:section", async (req, res) => {
  try {
    const { branch, year, section } = req.params;

    const timetable = await Timetable.find({ branch, year: parseInt(year), section })
      .lean();

    const result = DAYS.map((day) => {
      const found = timetable.find((t) => t.day === day);
      return { day, slots: found?.slots || [] };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch timetable" });
  }
});

// CREATE or UPDATE timetable for a day (admin only)
router.post("/", protect, async (req, res) => {
  try {
    const { branch, year, section, day, slots } = req.body;

    if (!branch || !year || !section || !day || !slots) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const timetable = await Timetable.findOneAndUpdate(
      { branch, year, section, day },
      { slots },
      { upsert: true, new: true }
    );

    res.json(timetable);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save timetable" });
  }
});

// DELETE a day's timetable (admin only)
router.delete("/:id", protect, async (req, res) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete" });
  }
});

export default router;