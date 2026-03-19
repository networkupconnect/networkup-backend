import express from "express";
import Post from "../models/Post.js";
import { annauth as protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// GET all posts (newest first) - PUBLIC
router.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "profileImage name")
      .lean();

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

// ==================== PROTECTED ROUTES ====================


// CREATE a new post - PROTECTED
router.post("/post", protect, upload.single("image"), async (req, res) => {
  try {
    const { caption } = req.body;
    const hasImage = !!req.file;
    const hasCaption = caption && caption.trim() !== "";

    if (!hasImage && !hasCaption) {
      return res.status(400).json({ message: "Please add a photo or write something" });
    }

    const newPost = new Post({
      userId: req.user._id,
      userName: req.user.name,
      image: hasImage ? req.file.path : "",
      caption: hasCaption ? caption.trim() : "",
    });

    await newPost.save();
    await newPost.populate("userId", "profileImage name");

    res.status(201).json(newPost);
  } catch (err) {
    console.error("CREATE POST ERROR ❌", err.message);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// DELETE a post - PROTECTED (only post owner)
router.delete("/post/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("DELETE POST ERROR ❌", err);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

// LIKE/UNLIKE a post - PROTECTED
router.post("/post/:id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = req.user._id;
    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
    }

    await post.save();
    res.json({ likes: post.likes.length, liked: !alreadyLiked });
  } catch (err) {
    console.error("LIKE POST ERROR ❌", err);
    res.status(500).json({ message: "Failed to like post" });
  }
});

// ADD comment to a post - PROTECTED
router.post("/post/:id/comment", protect, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newComment = {
      userId: req.user._id,
      userName: req.user.name,
      text: text.trim(),
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    res.status(201).json(newComment);
  } catch (err) {
    console.error("ADD COMMENT ERROR ❌", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

// GET user posts
router.get("/user/:userId/posts", async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("userId", "profileImage name")
      .lean();

    res.json(posts);
  } catch (err) {
    console.error("FETCH USER POSTS ERROR ❌", err);
    res.status(500).json({ message: "Failed to fetch user posts" });
  }
});

// DELETE comment - PROTECTED (only comment owner)
router.delete("/post/:postId/comment/:commentId", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    comment.remove();
    await post.save();

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("DELETE COMMENT ERROR ❌", err);
    res.status(500).json({ message: "Failed to delete comment" });
  }
});

export default router;