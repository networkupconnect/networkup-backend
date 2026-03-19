import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type:        { type: String, enum: ["bug", "feature", "suggestion", "other"], required: true },
  title:       { type: String, required: true },
  description: { type: String, required: true },
  status:      { type: String, enum: ["new", "in-review", "resolved", "dismissed"], default: "new" },
}, { timestamps: true });

export default mongoose.model("Feedback", feedbackSchema);