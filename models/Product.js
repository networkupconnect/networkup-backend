import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    // ── Multi-image support ──────────────────────────────────────────────
    images: {
      type: [String],   // array of file paths / URLs
      default: [],
    },
    // backward-compat: single image field (set to images[0] on create)
    image: {
      type: String,
      required: false,
    },
    // ────────────────────────────────────────────────────────────────────
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sellerName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;