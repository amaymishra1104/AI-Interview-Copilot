const { getAI } = require("./llm");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateCareerPlan(stats, targetRole, userApiKey = null) {
  const prompt = `
You are an expert career coach and technical mentor.

Analyze this candidate's interview performance data and create a personalized career development plan.

Target role: ${targetRole}

Interview stats:
- Sessions completed: ${stats.sessionCount}
- Average score: ${stats.avgScore}/10
- Roles practiced: ${stats.roles.join(", ") || "General"}

Top weaknesses (with frequency):
${stats.topWeaknesses.map((w) => `- ${w.text} (${w.count}x)`).join("\n") || "- None recorded yet"}

Top strengths (with frequency):
${stats.topStrengths.map((s) => `- ${s.text} (${s.count}x)`).join("\n") || "- None recorded yet"}

Low-scoring moments:
${stats.lowScoreMoments.map((m) => `- [${m.score}/10] ${m.role}: ${m.question?.slice(0, 120)} — ${m.suggestions?.slice(0, 100)}`).join("\n") || "- None"}

Return ONLY valid JSON matching this schema exactly. No markdown, no extra text.

{
  "weakness_analysis": {
    "summary": "<2-3 sentence overview of patterns>",
    "patterns": [
      { "theme": "<string>", "frequency": "<high|medium|low>", "impact": "<string>", "root_cause": "<string>" }
    ],
    "priority_areas": ["<string>", "<string>", "<string>"]
  },
  "learning_roadmap": [
    {
      "week": 1,
      "focus": "<string>",
      "topics": ["<string>", "<string>"],
      "resources": ["<string — book, course, or doc name>"],
      "goals": ["<measurable goal>"]
    }
  ],
  "recommended_projects": [
    {
      "title": "<string>",
      "description": "<string>",
      "skills_addressed": ["<string>"],
      "difficulty": "<beginner|intermediate|advanced>",
      "estimated_weeks": 2
    }
  ]
}

Requirements:
- learning_roadmap must have exactly 4 weeks
- recommended_projects must have exactly 3 projects
- patterns must have 2-4 entries
- Be specific to the weaknesses shown, not generic advice
`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const client = getAI(userApiKey);
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let textData = response.text || "";
      if (typeof response.text === "function") textData = response.text();

      const firstBrace = textData.indexOf("{");
      const lastBrace = textData.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("AI did not return valid JSON.");
      }

      return JSON.parse(textData.substring(firstBrace, lastBrace + 1));
    } catch (error) {
      const isRateLimit = error?.status === 429 || error?.message?.includes("429");
      if (isRateLimit && attempt < 3) {
        await sleep(attempt * 8000);
        continue;
      }
      console.error("Mentor AI Error:", error.message || error);
      throw new Error("Failed to generate career plan");
    }
  }
}

module.exports = { generateCareerPlan };
