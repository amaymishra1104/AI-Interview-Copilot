const { getAI, extractResponseText } = require("./llm");

async function extractResumeContext(resumeText, userApiKey = null) {
  const prompt = `Extract key professional information from this resume for interview preparation.

Resume:
${resumeText.substring(0, 4000)}

Return ONLY a valid JSON object, no markdown, no extra text:
{
  "name": "<candidate name or Unknown>",
  "years_experience": <number>,
  "top_skills": ["<skill>", "<skill>", "<skill>"],
  "recent_role": "<most recent job title>",
  "recent_company": "<most recent company>",
  "key_projects": ["<brief project description>"],
  "education": "<highest degree and institution>",
  "summary": "<2-3 sentence professional summary>"
}`;

  try {
    const client = getAI(userApiKey);
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    let text = extractResponseText(response);
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1) throw new Error("No JSON in response");
    return JSON.parse(text.substring(first, last + 1));
  } catch (err) {
    console.error("Resume parse error:", err.message);
    return null;
  }
}

module.exports = { extractResumeContext };
