const mongoose = require("mongoose")
require("dotenv").config()
const connectDB = require("./config/db")
const User = require("./models/User")

const seed = async () => {
  try {
    await connectDB()
    const exists = await User.findOne({ email: "test@local.com" })
    if (exists) {
      console.log("Seed user already exists: test@local.com")
      process.exit(0)
    }

    const user = new User({
      name: "Test User",
      email: "test@local.com",
      password: "password",
      role: "user",
    })

    await user.save()
    console.log("Seed user created: test@local.com / password")
    process.exit(0)
  } catch (err) {
    console.error("Seed failed ❌", err)
    process.exit(1)
  }
}

seed()
