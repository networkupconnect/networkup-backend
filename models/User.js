import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name:         { type: String },
    username:     { type: String, unique: true, sparse: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:     { type: String },
    description:  { type: String },
    profileImage: { type: String, default: "" },
    role: {
      type: String,
      enum: ["user", "seller", "admin"],
      default: "user",
    },

    // ── Academic info ──────────────────────────────────────────────────────────
    // "course" is new — BTech/MTech/BCA/MCA/BSc/MSc/MBA/BBA/B.Com/etc.
    // "branch", "year", "section" remain unchanged (backward compatible with existing BTech data)
    course:  { type: String, default: "" },
    branch:  { type: String, default: "" },
    year:    { type: Number, default: null },
    section: { type: String, default: "" },

    // ── Contact ────────────────────────────────────────────────────────────────
    phone: { type: String, default: "" },

    // ── Profile detail arrays ──────────────────────────────────────────────────
    skills:    { type: [String], default: [] },
    interests: { type: [String], default: [] },
    goals:     { type: [String], default: [] },

    // ── Onboarding ────────────────────────────────────────────────────────────
    // false until user completes the 3-step post-signup flow
    onboardingComplete: { type: Boolean, default: false },

    
    // ── Social graph ──────────────────────────────────────────────────────────
    connections:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    sentRequests:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);