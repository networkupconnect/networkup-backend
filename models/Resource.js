import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    description: { type: String, default: "" },
    type:        { type: String, enum: ["pyq", "notes", "assignment"], required: true },
    subject:     { type: String, required: true },
    unit:        { type: String, default: "General" },

    // ── Links (at least one required — enforced at route level) ──
    lectureLink: { type: String, default: "" },  // YouTube video / playlist
    notesLink:   { type: String, default: "" },  // Google Drive / any URL

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // ── Legacy fields (kept so old documents don't break) ──
    fileUrl: { type: String, default: "" },
    branch:  { type: String, default: "" },
    year:    { type: Number, default: null },
    section: { type: String, default: "all" },
  },
  { timestamps: true }
);

resourceSchema.index({ type: 1, createdAt: -1 });
resourceSchema.index({ subject: 1 });

export default mongoose.model("Resource", resourceSchema);