import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const isPdf = file.mimetype === "application/pdf";

    // Strip extension from original filename to use as public_id base
    const originalName = file.originalname.replace(/\.[^/.]+$/, "");
    const uniqueName = `${originalName}_${Date.now()}`;

    if (isPdf) {
      return {
        folder: "campusly",
        resource_type: "raw",
        // ✅ This ensures Cloudinary stores it with .pdf in the public_id
        // so the URL ends with .pdf and downloads correctly
        public_id: `${uniqueName}.pdf`,
        allowed_formats: ["pdf"],
      };
    }

    return {
      folder: "campusly",
      resource_type: "image",
      public_id: uniqueName,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      transformation: [{ width: 1000, height: 1000, crop: "limit" }],
    };
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed!"), false);
    }
  },
});

export default upload;