const mongoose = require('mongoose')
require('dotenv').config()
const connectDB = require('./config/db')
const User = require('./models/User')
const bcrypt = require('bcryptjs')

const email = process.argv[2] || 'admin1@local.com'
const newPassword = process.argv[3] || 'adminpass'

const run = async () => {
  try {
    await connectDB()
    const user = await User.findOne({ email })
    if (!user) {
      console.error('User not found:', email)
      process.exit(1)
    }
    const hashed = await bcrypt.hash(newPassword, 10)
    user.password = hashed
    await user.save()
    console.log(`Password for ${email} reset to '${newPassword}'`)
    process.exit(0)
  } catch (err) {
    console.error('Reset failed', err)
    process.exit(1)
  }
}

run()