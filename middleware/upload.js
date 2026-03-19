import multer from "multer";
import pkg from 'multer-storage-cloudinary';
import { v2 as cloudinary } from "cloudinary";

const { CloudinaryStorage } = pkg;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === "application/pdf";
    
    // Ek unique string generate kar rahe hain taaki naam clash na ho
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    
    return {
      folder: "campusly",
      // ✅ 1. Use 'raw' for PDFs so they don't get corrupted by Cloudinary's image engine.
      resource_type: isPdf ? "raw" : "image",
      
      // ✅ 2. Force '.pdf' extension inside the public_id itself! 
      // This prevents the frontend 404 error by giving it exactly what it expects.
      public_id: isPdf ? `doc_${uniqueSuffix}.pdf` : `img_${uniqueSuffix}`,
      
      // Images ke liye transformations
      ...(!isPdf && {
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: [{ width: 1000, height: 1000, crop: "limit" }],
      }),
    };
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB to allow PDFs
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