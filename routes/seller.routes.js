import express from "express";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import upload from "../middleware/upload.js";
import { annauth as protect, authorize } from "../middleware/auth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/* ===========================
   🗑️ DELETE PRODUCT
   =========================== */
router.delete(
  "/product/:id",
  protect,
  authorize("seller", "admin"),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: "Product not found" });

      if (product.sellerId.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Not allowed" });

      // Delete all image files
      const imagePaths = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.image ? [product.image] : [];

      imagePaths.forEach((imgPath) => {
        const fullPath = path.join(__dirname, "..", imgPath.replace(/^\/+/, ""));
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      });

      await product.deleteOne();
      res.json({ message: "Product deleted successfully" });
    } catch (err) {
      console.error("DELETE PRODUCT ERROR ❌", err);
      res.status(500).json({ message: "Failed to delete product" });
    }
  }
);

/* ===========================
   ➕ ADD PRODUCT (multi-image)
   =========================== */
router.post(
  "/product",
  protect,
  authorize("seller", "admin"),
  upload.array("images", 5),   // ← accept up to 5 images under field "images"
  async (req, res) => {
    try {
      const { title, price } = req.body;

      if (!title || !price)
        return res.status(400).json({ message: "Title and price are required" });

      if (!req.files || req.files.length === 0)
        return res.status(400).json({ message: "At least one image is required" });

      const numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice < 0)
        return res.status(400).json({ message: "Invalid price" });

      const imagePaths = req.files.map((f) => f.path);

      const product = await Product.create({
        title: String(title).trim(),
        price: numericPrice,
        sellerId: req.user._id,
        sellerName: req.user.name || "",
        images: imagePaths,             // array of paths
        image: imagePaths[0],           // backward-compat: first image
      });

      res.status(201).json(product);
    } catch (err) {
      console.error("ADD PRODUCT ERROR ❌", err);
      res.status(500).json({ message: err.message || "Failed to add product" });
    }
  }
);

/* ===========================
   📦 LIST PRODUCTS
   =========================== */
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 });
    res.json(products);
  } catch (err) {
    console.error("FETCH PRODUCTS ERROR ❌", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/* ===========================
   📬 SELLER ORDERS (with buyer name populated)
   =========================== */
router.get(
  "/orders",
  protect,
  authorize("seller", "admin"),
  async (req, res) => {
    try {
      const orders = await Order.find({ "items.sellerId": req.user._id })
        .populate("user", "name email")   // ← populate buyer name
        .sort({ _id: -1 });

      res.json(orders);
    } catch (err) {
      console.error("FETCH SELLER ORDERS ERROR ❌", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  }
);

export default router;