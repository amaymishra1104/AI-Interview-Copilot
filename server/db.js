const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ MONGO_URI is missing. Add it in Render → Environment.");
    process.exit(1);
  }

  const options = {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await mongoose.connect(uri, options);
      console.log("🟢 MongoDB Successfully Connected!");
      return;
    } catch (err) {
      console.error(`🔴 MongoDB attempt ${attempt}/3 failed:`, err.message);
      if (attempt === 3) {
        console.error("❌ Could not connect to MongoDB. Check MONGO_URI and Atlas Network Access (0.0.0.0/0).");
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
};

module.exports = connectDB;
