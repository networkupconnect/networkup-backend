import express from "express";
import User from "../models/User.js";
import { annauth as protect } from "../middleware/auth.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/connections/request/:targetId
// Send a connection request to another user
// ─────────────────────────────────────────────────────────────────────────────
router.post("/request/:targetId", protect, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { targetId } = req.params;

    if (myId === targetId)
      return res.status(400).json({ message: "Cannot connect with yourself" });

    const [me, target] = await Promise.all([
      User.findById(myId),
      User.findById(targetId),
    ]);
    if (!target) return res.status(404).json({ message: "User not found" });

    // Already connected
    if (me.connections.map(String).includes(targetId))
      return res.status(400).json({ message: "Already connected" });

    // Already sent a request
    if (me.sentRequests.map(String).includes(targetId))
      return res.status(400).json({ message: "Request already sent" });

    // If the target already sent ME a request → auto-accept
    if (me.pendingRequests.map(String).includes(targetId)) {
      me.pendingRequests.pull(targetId);
      target.sentRequests.pull(myId);
      me.connections.addToSet(targetId);
      target.connections.addToSet(myId);
      await Promise.all([me.save(), target.save()]);
      return res.json({ status: "connected" });
    }

    // Normal: add to sentRequests / pendingRequests
    me.sentRequests.addToSet(targetId);
    target.pendingRequests.addToSet(myId);
    await Promise.all([me.save(), target.save()]);

    res.json({ status: "requested" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send request" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/connections/accept/:requesterId
// Accept an incoming connection request
// ─────────────────────────────────────────────────────────────────────────────
router.post("/accept/:requesterId", protect, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { requesterId } = req.params;

    const [me, requester] = await Promise.all([
      User.findById(myId),
      User.findById(requesterId),
    ]);
    if (!requester) return res.status(404).json({ message: "User not found" });

    if (!me.pendingRequests.map(String).includes(requesterId))
      return res.status(400).json({ message: "No pending request from this user" });

    // Remove from pending / sent
    me.pendingRequests.pull(requesterId);
    requester.sentRequests.pull(myId);

    // Add to connections (mutual)
    me.connections.addToSet(requesterId);
    requester.connections.addToSet(myId);

    await Promise.all([me.save(), requester.save()]);
    res.json({ status: "connected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to accept request" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/connections/decline/:requesterId
// Decline an incoming connection request
// ─────────────────────────────────────────────────────────────────────────────
router.post("/decline/:requesterId", protect, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { requesterId } = req.params;

    const [me, requester] = await Promise.all([
      User.findById(myId),
      User.findById(requesterId),
    ]);

    me.pendingRequests.pull(requesterId);
    if (requester) requester.sentRequests.pull(myId);

    await Promise.all([me.save(), requester?.save()]);
    res.json({ status: "declined" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to decline request" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/connections/cancel/:targetId
// Cancel an outgoing request you already sent
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/cancel/:targetId", protect, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { targetId } = req.params;

    const [me, target] = await Promise.all([
      User.findById(myId),
      User.findById(targetId),
    ]);



    
    me.sentRequests.pull(targetId);
    if (target) target.pendingRequests.pull(myId);

    await Promise.all([me.save(), target?.save()]);
    res.json({ status: "cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel request" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/connections/remove/:targetId
// Remove an existing connection (both sides)
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/remove/:targetId", protect, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { targetId } = req.params;

    await Promise.all([
      User.findByIdAndUpdate(myId, { $pull: { connections: targetId } }),
      User.findByIdAndUpdate(targetId, { $pull: { connections: myId } }),
    ]);

    res.json({ status: "removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove connection" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/connections/requests
// Get your incoming pending requests (with sender info)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/requests", protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .populate("pendingRequests", "name username profileImage branch year")
      .lean();
    res.json(me.pendingRequests || []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch requests" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/connections
// Get your accepted connections list
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .populate("connections", "name username profileImage branch year")
      .lean();
    res.json(me.connections || []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch connections" });
  }
});

export default router;