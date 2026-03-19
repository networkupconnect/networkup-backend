import express from "express";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
// ✅ FIX: reuse the shared auth middleware — no duplicate JWT logic here
import { annauth as protect } from "../middleware/auth.js";

const router = express.Router();

// ─── POST /api/orders — create order ─────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { items, totalAmount } = req.body;

    // ── Validate payload ─────────────────────────────────────────────────
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "Order items missing" });

    if (!totalAmount || Number(totalAmount) <= 0)
      return res.status(400).json({ message: "Invalid total amount" });

    for (const item of items) {
      if (!item.title || !item.price || !item.quantity || !item.sellerId)
        return res.status(400).json({ message: `Invalid item: ${item.title || "(unknown)"}` });
    }

    // ── Create order ─────────────────────────────────────────────────────
    // ✅ protect sets req.user._id (not req.user.userId) — consistent with annauth
    const order = await Order.create({
      user: req.user._id,
      items: items.map(item => ({
        title: item.title,
        price: Number(item.price),
        quantity: item.quantity,
        sellerId: item.sellerId,
      })),
      totalAmount: Number(totalAmount),
    });

    // ── Notify each unique seller ─────────────────────────────────────────
    const buyer = await User.findById(req.user._id).select("name").lean();
    const uniqueSellerIds = [...new Set(items.map(i => String(i.sellerId)))];

    await Promise.all(
      uniqueSellerIds.map(sellerId => {
        const sellerItems = items.filter(i => String(i.sellerId) === sellerId);
        const itemNames = sellerItems.map(i => i.title).join(", ");

        return Notification.create({
          recipient: sellerId,
          sender: req.user._id,
          type: "order",
          title: "New Order Received",
          message: `${buyer?.name || "A student"} ordered: ${itemNames} (₹${totalAmount}). Tap to chat.`,
          link: `/Chat/${req.user._id}`,
        });
      })
    );

    res.status(201).json({ message: "Order placed successfully", order });
  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ message: "Order failed" });
  }
});

export default router;