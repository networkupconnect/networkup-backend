import express from "express";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { annauth as protect } from "../middleware/auth.js";

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ✅ Includes all fields needed client-side (connections for status checks, onboardingComplete for redirect)
const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  course: user.course ?? "",
  branch: user.branch ?? "",
  year: user.year ?? null,
  section: user.section ?? "",
  phone: user.phone ?? "",
  profileImage: user.profileImage,
  onboardingComplete: user.onboardingComplete ?? false,
  connections:     user.connections     ?? [],
  sentRequests:    user.sentRequests    ?? [],
  pendingRequests: user.pendingRequests ?? [],
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ message: "All fields are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already in use" });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password: hashed });
    return res.status(201).json({ token: signToken(user._id), user: safeUser(user) });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password)
      return res.status(400).json({ message: "Email and password are required" });
    const user = await User.findOne({ email: email.toLowerCase() });
    const dummy = "$2b$12$invalidhashfortimingattackprevention000000000000000000";
    const isMatch = user
      ? await bcrypt.compare(password, user.password || dummy)
      : await bcrypt.compare(password, dummy).then(() => false);
    if (!user || !isMatch)
      return res.status(401).json({ message: "Invalid email or password" });
    return res.json({ token: signToken(user._id), user: safeUser(user) });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/me", protect, async (req, res) => {
  try { return res.json(safeUser(req.user)); }
  catch (err) { return res.status(500).json({ message: "Server error" }); }
});

router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account",
  state: true,
}));

router.get("/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed` }),
  (req, res) => {
    try {
      if (!req.user) return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
      return res.redirect(`${FRONTEND_URL}/login?token=${signToken(req.user._id)}`);
    } catch (err) {
      console.error("GOOGLE CALLBACK ERROR:", err);
      return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
    }
  }
);

export default router;