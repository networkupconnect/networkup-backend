import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["room", "roommate"], required: true },
    rent: { type: Number, required: true },
    location: { type: String, required: true },
    images: [{ type: String }],
    facilities: [{ type: String }],
    contactName: { type: String },
    contactPhone: { type: String },
    isAvailable: { type: Boolean, default: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);