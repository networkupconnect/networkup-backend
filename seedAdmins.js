import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db.js";
import User from "./models/User.js";
import bcrypt from "bcryptjs";

const admins = [
  { name: "Admin One", email: "admin1@local.com", password: "adminpass" },
  { name: "Admin Two", email: "admin2@local.com", password: "adminpass" },
  { name: "Admin Three", email: "admin3@local.com", password: "adminpass" },
];

const seed = async () => {
  try {
    await connectDB();
    for (const a of admins) {
      const exists = await User.findOne({ email: a.email });
      if (!exists) {
        const hashed = await bcrypt.hash(a.password, 10);
        await new User({ name: a.name, email: a.email, password: hashed, role: "admin" }).save();
        console.log(`✅ Admin created: ${a.email}`);
      } else {
        console.log(`⚠️ Already exists: ${a.email}`);
      }
    }
    console.log("🎉 Done");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
};

seed();