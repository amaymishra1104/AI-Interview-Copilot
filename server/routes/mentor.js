const express = require("express");
const router = express.Router();

const mentorService = require("../services/mentor");
const { generateCareerPlan } = require("../ai/mentor");

// GET profile: aggregated stats + latest cached roadmap
router.get("/:clerkId", async (req, res) => {
  try {
    const { stats, latestRoadmap } = await mentorService.getMentorProfile(req.params.clerkId);
    res.json({
      stats,
      roadmap: latestRoadmap,
      hasData: stats.sessionCount > 0,
    });
  } catch (error) {
    console.error("Mentor fetch error:", error);
    res.status(500).json({ error: "Failed to fetch mentor profile" });
  }
});

// POST generate: AI weakness analysis + roadmap + projects
router.post("/generate", async (req, res) => {
  try {
    const { clerkId, userApiKey, targetRole } = req.body;
    if (!clerkId) {
      return res.status(400).json({ error: "clerkId is required" });
    }

    const { stats } = await mentorService.getMentorProfile(clerkId);
    if (stats.sessionCount === 0) {
      return res.status(400).json({
        error: "Complete at least one interview simulation before generating a career plan.",
      });
    }

    const role = targetRole || stats.roles[0] || "Software Engineer";
    const analysis = await generateCareerPlan(stats, role, userApiKey);
    const roadmap = await mentorService.saveRoadmap(clerkId, role, stats, analysis);

    res.json({ stats, roadmap, analysis });
  } catch (error) {
    console.error("Mentor generate error:", error);
    res.status(500).json({ error: error.message || "Failed to generate career plan" });
  }
});

module.exports = router;
