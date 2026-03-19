import express from "express";

const router = express.Router();

// ✅ Proxy route — fetches files from Cloudinary server-side (no CORS issues)
router.get("/proxy", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ message: "No URL provided" });

    // Only allow Cloudinary URLs for security
    if (!url.includes("cloudinary.com")) {
      return res.status(403).json({ message: "Only Cloudinary URLs are allowed" });
    }

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ message: "Failed to fetch file" });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/pdf";

    res.set("Content-Type", contentType);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=3600"); // cache for 1 hour
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ message: "Failed to fetch file" });
  }
});

export default router;