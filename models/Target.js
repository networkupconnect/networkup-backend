import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  { userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, stars: { type: Number, min: 1, max: 5 } },
  { _id: false }
);

const progressSchema = new mongoose.Schema({
  text:         { type: String, default: "" },
  image:        { type: String, default: "" },
  link:         { type: String, default: "" },
  isCompletion: { type: Boolean, default: false },
}, { timestamps: true });

const targetSchema = new mongoose.Schema({
  author:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:       { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  progress:    [progressSchema],
  ratings:     [ratingSchema],
}, { timestamps: true });

export default mongoose.model("Target", targetSchema);