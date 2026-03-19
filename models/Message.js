import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true }, // sorted userId pair e.g. "abc_xyz"
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);