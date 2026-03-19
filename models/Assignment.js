import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount:    { type: Number, required: true },
  message:   { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const assignmentSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  subject:     { type: String, required: true },
  budget:      { type: Number, required: true },
  deadline:    { type: Date, required: true },
  attachments: [{ type: String }],
  tags:        [{ type: String }],
  status:      { type: String, enum: ["open", "assigned", "completed", "cancelled"], default: "open" },
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  bids:        [bidSchema],
  acceptedBid: { type: Number, default: null },
}, { timestamps: true });

export default mongoose.model("Assignment", assignmentSchema);