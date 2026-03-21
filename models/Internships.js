import mongoose from "mongoose";

const internshipSchema = new mongoose.Schema(
  {
    externalId:  { type: String, unique: true, required: true }, // ID from RapidAPI
    title:       { type: String, default: "" },
    company:     { type: String, default: "" },
    location:    { type: String, default: "" },
    type:        { type: String, default: "" },
    url:         { type: String, default: "" },
    description: { type: String, default: "" },
    logo:        { type: String, default: "" },
    remote:      { type: Boolean, default: false },
    source:      { type: String, default: "" },
    postedAt:    { type: Date, default: null },
    fetchedAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

internshipSchema.index({ title: "text", company: "text", location: "text" });
internshipSchema.index({ fetchedAt: -1 });

export default mongoose.model("Internship", internshipSchema);