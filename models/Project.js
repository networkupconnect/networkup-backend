import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  { userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, stars: { type: Number, min: 1, max: 5 } },
  { _id: false }
);

const projectSchema = new mongoose.Schema({
  author:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:       { type: String, required: true },
  tagline:     { type: String, default: "" },
  description: { type: String, default: "" },
  tags:        { type: [String], default: [] },
  techStack:   { type: [String], default: [] },   // legacy — keep for backward compat
  liveUrl:     { type: String, default: "" },
  repoUrl:     { type: String, default: "" },
  ytUrl:       { type: String, default: "" },
  coverImages: { type: [String], default: [] },
  coverImage:  { type: String, default: "" },     // legacy
  status:      { type: String, enum: ["in-progress", "completed", "idea"], default: "in-progress" },
  likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  ratings:     [ratingSchema],
}, { timestamps: true });

export default mongoose.model("Project", projectSchema);