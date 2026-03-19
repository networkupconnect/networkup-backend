import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

// ✅ FIX: Validate env vars at startup, not silently at runtime
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("❌ GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env");
}
if (!process.env.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET must be set in .env");
}
if (!process.env.FRONTEND_URL) {
  console.warn("⚠️  FRONTEND_URL not set — defaulting to http://localhost:5173");
}

// ✅ FIX: callbackURL from env — never hardcode production URLs in source code
const CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "https://network.networkup.in/api/auth/google/callback";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();

        if (!email) {
          return done(new Error("No email received from Google — check OAuth scope"), null);
        }

        // ✅ findOneAndUpdate with upsert: atomic, no race condition on duplicate signups
        const user = await User.findOneAndUpdate(
          { email },
          {
            $setOnInsert: {
              name: profile.displayName,
              email,
              role: "user",
              // password intentionally omitted for Google-only accounts
            },
          },
          { upsert: true, new: true }
        );

        return done(null, user);
      } catch (err) {
        console.error("🚨 GOOGLE STRATEGY ERROR:", err.message);
        return done(err, null);
      }
    }
  )
);

// No serializeUser/deserializeUser needed — using JWT (stateless)

export default passport;