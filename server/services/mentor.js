const sessionService = require("./session");
const RoadmapModel = require("../models/roadmap.model");

function countItems(items = []) {
  const counts = {};
  for (const item of items) {
    const key = item?.trim();
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count);
}

function aggregateUserData(sessions) {
  const allWeaknesses = [];
  const allStrengths = [];
  const allScores = [];
  const lowScoreMoments = [];

  for (const session of sessions) {
    allWeaknesses.push(...(session.globalWeaknesses || []));
    allStrengths.push(...(session.globalStrengths || []));
    for (const entry of session.history || []) {
      const score = entry?.evaluation?.score;
      if (typeof score === "number") {
        allScores.push(score);
        if (score < 6) {
          lowScoreMoments.push({
            role: session.role,
            question: entry.question,
            score,
            suggestions: entry.evaluation?.suggestions || "",
            difficulty: entry.difficulty,
          });
        }
      }
    }
  }

  const avgScore = allScores.length
    ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1))
    : 0;

  return {
    sessionCount: sessions.length,
    avgScore,
    topWeaknesses: countItems(allWeaknesses).slice(0, 10),
    topStrengths: countItems(allStrengths).slice(0, 10),
    lowScoreMoments: lowScoreMoments.slice(0, 8),
    roles: [...new Set(sessions.map((s) => s.role).filter(Boolean))],
  };
}

async function getLatestRoadmap(clerkId) {
  return RoadmapModel.findOne({ clerkId }).sort({ createdAt: -1 });
}

async function saveRoadmap(clerkId, targetRole, stats, analysis) {
  return RoadmapModel.create({
    clerkId,
    targetRole,
    stats,
    weakness_analysis: analysis.weakness_analysis,
    learning_roadmap: analysis.learning_roadmap,
    recommended_projects: analysis.recommended_projects,
  });
}

async function getMentorProfile(clerkId) {
  const sessions = await sessionService.getSessionsByUser(clerkId);
  const stats = aggregateUserData(sessions);
  const latestRoadmap = await getLatestRoadmap(clerkId);
  return { stats, latestRoadmap, sessions };
}

module.exports = {
  aggregateUserData,
  getLatestRoadmap,
  saveRoadmap,
  getMentorProfile,
};
