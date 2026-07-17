const { getAI } = require("./llm");

async function runCoachAgent(sessions, targetRole, userApiKey) {
  // Step 1 — Observe: aggregate weakness/strength data across all sessions
  const weaknessCounts = {};
  const strengthCounts = {};
  let totalScore = 0;
  let scoreCount = 0;
  const roleFreq = {};

  for (const session of sessions) {
    const r = session.role || "Unknown";
    roleFreq[r] = (roleFreq[r] || 0) + 1;

    for (const h of session.history || []) {
      const ev = h.evaluation;
      if (!ev) continue;
      if (ev.score) { totalScore += ev.score; scoreCount++; }
      (ev.detected_weaknesses || []).forEach(w => { weaknessCounts[w] = (weaknessCounts[w] || 0) + 1; });
      (ev.detected_strengths || []).forEach(s => { strengthCounts[s] = (strengthCounts[s] || 0) + 1; });
    }
  }

  const topWeaknesses = Object.entries(weaknessCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  const topStrengths  = Object.entries(strengthCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);
  const avgScore      = scoreCount ? (totalScore / scoreCount).toFixed(1) : null;
  const mostPracticedRole = Object.entries(roleFreq).sort((a, b) => b[1] - a[1])[0]?.[0];
  const role = targetRole || mostPracticedRole || "Software Engineer";

  // Step 2 — Reason: call Gemini to synthesize patterns and generate targeted drill
  const client = getAI(userApiKey);

  const prompt = `You are an expert technical interview coach. Analyze this candidate's performance data and create a targeted coaching plan.

Candidate data:
- Target role: ${role}
- Sessions completed: ${sessions.length}
- Average score across all answers: ${avgScore ?? "N/A"}/10
- Recurring weaknesses (most frequent first): ${topWeaknesses.length ? topWeaknesses.join(", ") : "none yet"}
- Demonstrated strengths: ${topStrengths.length ? topStrengths.join(", ") : "none yet"}

Your task — think step by step:
1. Identify the single biggest gap holding this candidate back
2. Design one targeted drill question that directly addresses it
3. Give a concrete, actionable tip for that specific question
4. Suggest 3 next actions to improve over the next week

Respond with raw JSON only (no markdown fences):
{
  "insight": "One sharp sentence describing the biggest pattern you see",
  "priority_weakness": "The single most important area to fix",
  "drill_question": "A specific interview question targeting that exact weakness",
  "drill_tip": "One concrete sentence: how to approach this question well",
  "next_steps": ["Action 1", "Action 2", "Action 3"],
  "encouragement": "One genuine sentence of motivation tailored to their progress"
}`;

  const res = await client.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
  let text = typeof res.text === "function" ? res.text() : (res.text || "");
  text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  const coaching = JSON.parse(text);

  return {
    stats: { avgScore, sessionCount: sessions.length, topWeaknesses, topStrengths, role },
    coaching,
  };
}

module.exports = { runCoachAgent };
