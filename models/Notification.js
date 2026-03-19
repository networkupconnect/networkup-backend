import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type:      { type: String, enum: ["order", "message", "general"], default: "general" },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  link:      { type: String }, // e.g. /seller to view orders
  read:      { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);