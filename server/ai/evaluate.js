const { getAI, extractResponseText, getLangInstruction } = require("./llm");

// Helper: sleep for ms milliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function evaluateAnswer(question, answer, currentDifficulty = "Medium", userApiKey = null, isCodingRound = false, language = "English") {
  const langLine = getLangInstruction(language);

  const prompt = isCodingRound ? `
You are a senior engineer doing a code review on a candidate's solution.${langLine}

Problem: ${question}
Their code:
${answer}

Be direct and specific — like a colleague reviewing a PR, not a professor grading homework.

Return ONLY valid JSON. No markdown, no extra text.

{
  "score": <0-10>,
  "correctness": "<one sentence: does it work? any bugs or edge cases missed?>",
  "clarity": "<one sentence on readability — naming, structure, comments>",
  "confidence": "<one sentence inference from their approach and code style>",
  "suggestions": "<the single most useful thing they should fix or improve, phrased like a code review comment>",
  "ideal_answer": "<a clean, optimal solution with a one-line explanation of the key insight>",
  "detected_strengths": ["<specific thing they did well>"],
  "detected_weaknesses": ["<specific gap or mistake>"],
  "suggested_next_difficulty": "<'Easy' | 'Medium' | 'Hard'>",
  "time_complexity": "<Big-O of their solution>",
  "space_complexity": "<Big-O of their solution>"
}
` : `
You are evaluating a candidate's answer in a ${currentDifficulty}-level interview. Be honest and direct — like a senior engineer giving real feedback, not a teacher being nice.${langLine}

Question: ${question}
Their answer: ${answer}

Return ONLY valid JSON. No markdown, no extra text.

{
  "score": <0-10, be calibrated — 7 means genuinely good, not just adequate>,
  "correctness": "<one casual sentence on whether they got it right — talk like a colleague, not a textbook>",
  "clarity": "<one sentence on how clearly they explained it>",
  "confidence": "<one sentence reading their confidence from tone and structure>",
  "suggestions": "<the ONE thing that would most improve their answer — be specific, not generic>",
  "ideal_answer": "<a concise model answer that a strong candidate would give — conversational, not textbook>",
  "detected_strengths": ["<specific thing they did well>", "<another if applicable>"],
  "detected_weaknesses": ["<specific gap>", "<another if applicable>"],
  "suggested_next_difficulty": "<'Easy' | 'Medium' | 'Hard'>"
}
`;

  // Retry up to 3 times with exponential backoff for 429 rate limits
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const client = getAI(userApiKey);
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let textData = extractResponseText(response);

      const firstBrace = textData.indexOf("{");
      const lastBrace = textData.lastIndexOf("}");

      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("AI did not return a valid JSON object.");
      }

      const cleanedText = textData.substring(firstBrace, lastBrace + 1);
      return JSON.parse(cleanedText);

    } catch (error) {
      const isRateLimit = error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota");

      if (isRateLimit && attempt < 3) {
        const waitTime = attempt * 8000; // 8s, then 16s
        console.warn(`⚠️  Gemini rate limit hit. Retrying in ${waitTime / 1000}s... (attempt ${attempt}/3)`);
        await sleep(waitTime);
        continue;
      }

      // If answer is too short/garbage, return a graceful fallback instead of crashing
      if (answer.trim().split(/\s+/).length < 5) {
        console.warn("Answer too short — returning fallback evaluation.");
        return {
          score: 1,
          correctness: "The answer was too brief to evaluate properly.",
          clarity: "Very low clarity — no substantive content provided.",
          confidence: "Cannot assess confidence from this response.",
          suggestions: "Please provide a detailed, structured answer of at least a few sentences.",
          ideal_answer: "A complete answer should address the concept, provide an example, and cover edge cases.",
          detected_strengths: [],
          detected_weaknesses: ["Extremely brief response", "No technical depth shown"],
          suggested_next_difficulty: "Easy",
          ...(isCodingRound && { time_complexity: "N/A", space_complexity: "N/A" })
        };
      }

      console.error("Evaluation Error:", error.message || error);
      throw new Error("Failed to evaluate answer");
    }
  }
}

module.exports = { evaluateAnswer };
