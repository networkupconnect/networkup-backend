import express from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { annauth as protect } from "../middleware/auth.js";

const router = express.Router();

// Helper to create consistent conversationId from two user IDs
const getConversationId = (id1, id2) =>
    [id1.toString(), id2.toString()].sort().join("_");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/conversations
// Get all conversations for current user (last message per convo)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/conversations", protect, async (req, res) => {
    try {
        const userId = req.user._id;

        const messages = await Message.find({
            $or: [{ senderId: userId }, { receiverId: userId }],
        })
            .sort({ createdAt: -1 })
            .populate("senderId", "name profileImage")
            .populate("receiverId", "name profileImage");

        const seen = new Set();
        const conversations = [];

        for (const msg of messages) {
            const otherId =
                msg.senderId._id.toString() === userId.toString()
                    ? msg.receiverId._id.toString()
                    : msg.senderId._id.toString();

            if (!seen.has(otherId)) {
                seen.add(otherId);
                const other =
                    msg.senderId._id.toString() === userId.toString()
                        ? msg.receiverId
                        : msg.senderId;

                conversations.push({
                    conversationId: msg.conversationId,
                    other,
                    lastMessage: msg.text,
                    lastMessageAt: msg.createdAt,
                    unread:
                        msg.receiverId._id.toString() === userId.toString() && !msg.read,
                });
            }
        }

        res.json(conversations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch conversations" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/messages/:userId
// Get messages between current user and another user
// ─────────────────────────────────────────────────────────────────────────────
router.get("/messages/:userId", protect, async (req, res) => {
    if (req.params.userId === req.user._id.toString()) {
        return res.status(400).json({ message: "You cannot chat with yourself" });
    }
    try {
        const conversationId = getConversationId(req.user._id, req.params.userId);

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .lean();

        // Mark messages as read
        await Message.updateMany(
            { conversationId, receiverId: req.user._id, read: false },
            { read: true }
        );

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch messages" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/users
// Get all users to start a new chat
// ─────────────────────────────────────────────────────────────────────────────
router.get("/users", protect, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } })
            .select("name profileImage username")
            .lean();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

export default router;