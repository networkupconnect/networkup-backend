import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Post from "../models/Post.js";
import { annauth as auth } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch { res.status(500).json({ message: "Failed to fetch products" }); }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch { res.status(500).json({ message: "Failed to get profile" }); }
});

router.put("/me", auth, async (req, res) => {
  try {
    const {
      name, username, description,
      course, branch, year, section,  // ✅ course added; branch/year/section kept
      phone,                           // ✅ phone added
      skills, interests, goals,
      onboardingComplete,              // ✅ onboardingComplete added
    } = req.body;

    const update = {};
    if (name        !== undefined) update.name        = name;
    if (username    !== undefined) update.username    = username;
    if (description !== undefined) update.description = description;
    if (course      !== undefined) update.course      = course;
    if (branch      !== undefined) update.branch      = branch;
    if (year        !== undefined) update.year        = Number(year);
    if (section     !== undefined) update.section     = section;
    if (phone       !== undefined) update.phone       = phone;
    if (onboardingComplete !== undefined) update.onboardingComplete = Boolean(onboardingComplete);

    if (Array.isArray(skills))    update.skills    = skills;
    if (Array.isArray(interests)) update.interests = interests;
    if (Array.isArray(goals))     update.goals     = goals;

    // Username uniqueness check
    if (username) {
      const exists = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ message: "Username already taken" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

router.put("/me/profile-image", auth, upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profileImage: req.file.path } },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("UPDATE PROFILE IMAGE ERROR:", err.message);
    res.status(500).json({ message: "Failed to update profile image" });
  }
});

router.put("/me/password", auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "Old and new password are required" });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.password)
      return res.status(400).json({ message: "This account uses Google sign-in. No password to change." });
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(401).json({ message: "Old password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch { res.status(500).json({ message: "Failed to change password" }); }
});

router.put("/me/role", auth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "seller"].includes(role))
      return res.status(400).json({ message: "Invalid role" });
    const user = await User.findByIdAndUpdate(req.user._id, { $set: { role } }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ token, user: safeUser });
  } catch { res.status(500).json({ message: "Failed to change role" }); }
});

router.get("/me/posts", auth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));
    const skip  = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      Post.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("userId", "profileImage name").lean(),
      Post.countDocuments({ userId: req.user._id }),
    ]);
    res.json({ posts, pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasMore: page * limit < total } });
  } catch { res.status(500).json({ message: "Failed to get posts" }); }
});

// ⚠️ MUST stay above /:userId
router.get("/all", auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("name username profileImage course branch year section")  // ✅ course added
      .sort({ course: 1, branch: 1, year: 1, section: 1, name: 1 })
      .lean();
    res.json(users);
  } catch (err) {
    console.error("FETCH ALL USERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// ⚠️ MUST be AFTER all /me and named routes
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "name username description profileImage course branch year section phone skills interests goals connections pendingRequests sentRequests"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch { res.status(500).json({ message: "Failed to get profile" }); }
});

router.get("/:userId/posts", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));
    const skip  = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      Post.find({ userId: req.params.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("userId", "profileImage name").lean(),
      Post.countDocuments({ userId: req.params.userId }),
    ]);
    res.json({ posts, pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasMore: page * limit < total } });
  } catch { res.status(500).json({ message: "Failed to get user posts" }); }
});

export default router;