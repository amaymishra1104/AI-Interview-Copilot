const mongoose = require("mongoose");

const RoadmapSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, index: true },
  targetRole: { type: String, default: "Software Engineer" },
  stats: {
    sessionCount: Number,
    avgScore: Number,
    topWeaknesses: [{ text: String, count: Number }],
    topStrengths: [{ text: String, count: Number }],
  },
  weakness_analysis: {
    summary: String,
    patterns: [{ theme: String, frequency: String, impact: String, root_cause: String }],
    priority_areas: [String],
  },
  learning_roadmap: [{
    week: Number,
    focus: String,
    topics: [String],
    resources: [String],
    goals: [String],
  }],
  recommended_projects: [{
    title: String,
    description: String,
    skills_addressed: [String],
    difficulty: String,
    estimated_weeks: Number,
  }],
}, { timestamps: true });

module.exports = mongoose.model("Roadmap", RoadmapSchema);
