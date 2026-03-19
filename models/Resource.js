import mongoose from "mongoose";


const getDownloadUrl = (url) => {
  if (!url) return { downloadUrl: url, validExt: "pdf" };

  const rawExt = url.split(".").pop().split("?")[0].toLowerCase();
  const imageExts = ["png", "jpg", "jpeg", "webp", "gif"];
  const isImage = imageExts.includes(rawExt);
  const validExt = isImage ? rawExt : "pdf";

  let downloadUrl = url;
  if (url.includes("/upload/")) {
    downloadUrl = url.replace("/upload/", `/upload/fl_attachment/`);
    if (validExt === "pdf" && !downloadUrl.endsWith(".pdf")) {
      downloadUrl = `${downloadUrl}.pdf`;
    }
  }

  return { downloadUrl, validExt };
};



const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    // ✅ Added "assignment" to enum
    type: { type: String, enum: ["pyq", "notes", "assignment"], required: true },
    branch: { type: String, required: true },
    year: { type: Number, required: true },
    section: { type: String, default: "all" },
    subject: { type: String, required: true },
    unit: { type: String, default: "General" }, // ✅ Added unit field
    fileUrl: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Resource", resourceSchema);