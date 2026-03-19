import mongoose from "mongoose";

const lostFoundSchema = new mongoose.Schema({
  type:        { type: String, enum: ["lost", "found"], required: true },
  title:       { type: String, required: true },
  description: { type: String, default: "" },
  category:    { type: String, required: true },
  location:    { type: String, required: true },
  date:        { type: Date },
  images:      [{ type: String }],
  contactInfo: { type: String, default: "" },
  reward:      { type: Number, default: null },
  resolved:    { type: Boolean, default: false },
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export default mongoose.model("LostFound", lostFoundSchema);