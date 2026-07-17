const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  clerkId: { type: String, default: null }, // Link to Clerk Auth
  role: { type: String, required: true },
  currentQuestion: { type: String },
  currentDifficulty: { type: String, default: "Medium" }, // Dynamic difficulty tracking
  globalStrengths: [{ type: String }],
  globalWeaknesses: [{ type: String }],
  history: [
    {
      question: String,
      answer: String,
      difficulty: String, // At what difficulty this question was asked
      evaluation: {
        score: Number,
        correctness: String,
        clarity: String,
        confidence: String,
        suggestions: String,
        ideal_answer: String,
        detected_strengths: [String],
        detected_weaknesses: [String],
        suggested_next_difficulty: String
      }
    }
  ],
  status: { type: String, default: "active", enum: ["active", "completed"] }
}, { timestamps: true });

module.exports = mongoose.model("Session", SessionSchema);
