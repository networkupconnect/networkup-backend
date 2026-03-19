import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* ───────────────────────────────
   Core auth middleware
─────────────────────────────── */
export const annauth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      // ✅ FIX: catch TokenExpiredError separately for a better client message
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Session expired, please log in again", code: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }

    // ✅ FIX: only use `userId` — that's what we sign with, no fallbacks needed
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err);
    return res.status(401).json({ message: "Not authorized" });
  }
};

/* ───────────────────────────────
   Profile completion guard
─────────────────────────────── */
export const requireProfileComplete = (req, res, next) => {
  if (req.user.role === "admin") return next();

  const { branch, year, section } = req.user;
  if (!branch || !year || !section) {
    return res.status(403).json({
      message: "Please complete your profile to access this feature.",
      code: "PROFILE_INCOMPLETE",
    });
  }


  
  next();
};

/* ───────────────────────────────
   Role-based access guard
─────────────────────────────── */
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Role '${req.user.role}' is not authorized to access this route`,
    });
  }
  next();
};