import mongoose from "mongoose";

const confessionSchema = new mongoose.Schema({
  text:     { type: String, required: true, maxlength: 500 },
  tag:      { type: String, default: "" },
  likes:    { type: Number, default: 0 },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // stored but NEVER sent to frontend
}, { timestamps: true });

export default mongoose.model("Confession", confessionSchema);