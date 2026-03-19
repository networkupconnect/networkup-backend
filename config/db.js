import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Support both MONGO_URI and MONGODB_URI
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    // Check if URI exists
    if (!mongoURI) {
      throw new Error("❌ MongoDB URI not found! Please set MONGO_URI or MONGODB_URI in environment variables");
    }

    // Connect with proper options
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log("✅ MongoDB connected successfully");
    
    // Optional: Log the database name (without exposing credentials)
    console.log(`📊 Connected to database: ${mongoose.connection.db.databaseName}`);
    
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    
    // More helpful error messages
    if (error.message.includes('ENOTFOUND')) {
      console.error("💡 Hint: Check if your MongoDB cluster URL is correct");
    } else if (error.message.includes('authentication failed')) {
      console.error("💡 Hint: Check your MongoDB username and password");
    } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.error("💡 Hint: Add '?retryWrites=true&w=majority&tls=true' to your connection string");
    }
    
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

export default connectDB;