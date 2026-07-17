const { GoogleGenAI } = require("@google/genai");

// Default AI instance using the platform's own env key (fallback)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Returns an AI instance using the user's own key if provided, else falls back to platform key
function getAI(userApiKey) {
  if (userApiKey && userApiKey.trim().length > 10) {
    return new GoogleGenAI({ apiKey: userApiKey.trim() });
  }
  return ai;
}

function getFirstName(resumeContext, candidateName) {
  const raw = (candidateName || resumeContext?.name || "").trim();
  if (!raw || /^unknown$/i.test(raw)) return null;
  return raw.split(/\s+/)[0];
}

function stripNamePlaceholders(text, firstName) {
  if (!text) return text;
  const name = firstName || "there";
  return text
    .replace(/\[Candidate Name\]/gi, name)
    .replace(/\[candidate'?s? name\]/gi, name)
    .replace(/\[Name\]/gi, name);
}

function extractResponseText(response) {
  if (!response) return "";
  let text = response.text;
  if (typeof text === "function") text = text();
  return String(text || "").trim();
}

function hasUsableApiKey(userApiKey) {
  const userKey = userApiKey?.trim();
  const platformKey = process.env.GEMINI_API_KEY?.trim();
  return (userKey && userKey.length > 10) || (platformKey && platformKey.length > 10);
}

function mapGeminiError(error) {
  const msg = error?.message || String(error);
  if (error?.status === 400 && /API key/i.test(msg)) {
    return { status: 401, error: "Invalid Gemini API key. Get a fresh key at aistudio.google.com/apikey" };
  }
  if (error?.status === 429 || /quota|rate limit/i.test(msg)) {
    return { status: 429, error: "Gemini rate limit hit. Wait a minute and try again." };
  }
  return { status: 500, error: "AI service error. Check your Gemini API key and try again." };
}

async function generateQuestion(role, userApiKey, resumeContext = null, isCodingRound = false, candidateName = null) {
  let prompt;

  if (isCodingRound) {
    prompt = `You are a technical interviewer conducting a coding interview for a ${role} position.
Generate ONE coding problem. Include:
1. Clear problem statement
2. Input/Output format
3. Constraints
4. 1-2 examples with expected output

Output ONLY the problem. No extra commentary.`;
  } else {
    const firstName = getFirstName(resumeContext, candidateName);
    const nameLine = firstName
      ? `\n- Name: ${firstName} (use this first name in your greeting — e.g. "Hi ${firstName}," — NEVER use placeholders like [Candidate Name])`
      : `\n- Name: not provided (do NOT use [Candidate Name] or any bracket placeholders — say "thanks for joining us" without a name)`;

    const resumeSection = resumeContext
      ? `\nCandidate Profile:${nameLine}\n- Recent Role: ${resumeContext.recent_role} at ${resumeContext.recent_company}\n- Experience: ${resumeContext.years_experience} years\n- Top Skills: ${(resumeContext.top_skills || []).join(", ")}\n- Background: ${resumeContext.summary}\n\nTailor the question to their specific background and the target role.`
      : `\nCandidate Profile:${nameLine}`;

    prompt = `You are a real human interviewer having a casual but professional conversation with a candidate for a ${role} role.${resumeSection}

Start the interview naturally — like you would in a real Zoom call or in-person interview. Sound warm, human, and direct.

Rules:
- ONE concept, easy-to-medium difficulty
- 1-2 sentences max
- Sound like a person, not a textbook
- Do NOT say "As an AI" or "As your interviewer" — just talk naturally
- NEVER output bracket placeholders like [Candidate Name] — use the real name or skip the name
- Output ONLY what the interviewer says (the question itself)`;
  }

  try {
    const client = getAI(userApiKey);
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const firstName = getFirstName(resumeContext, candidateName);
    const text = extractResponseText(response);
    if (!text) throw new Error("Gemini returned an empty response");
    return stripNamePlaceholders(text, firstName);
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
}

function getLangInstruction(language) {
  if (language === "Hindi") return "\n\nLANGUAGE: Respond entirely in Hindi (Devanagari script). Technical terms (like API, recursion, SQL) can stay in English but everything else must be Hindi.";
  if (language === "Hinglish") return "\n\nLANGUAGE: Respond in Hinglish — a natural mix of Hindi and English the way Indian engineers actually talk in interviews. Example: 'Okay so tell me, tumhara last project mein kya kiya tha? Koi specific challenge tha jo interesting laga?'";
  return ""; // English — default
}

function buildQuestionPrompt(role, resumeContext, isCodingRound, candidateName, drillFocus = null, language = "English") {
  const langLine = getLangInstruction(language);

  if (isCodingRound) {
    const drillLine = drillFocus
      ? `\nFocus: This is a targeted drill. Design the problem to specifically test: "${drillFocus}".`
      : "";
    return `You are a technical interviewer conducting a coding interview for a ${role} position.${drillLine}${langLine}
Generate ONE coding problem. Include:
1. Clear problem statement
2. Input/Output format
3. Constraints
4. 1-2 examples with expected output

Output ONLY the problem. No extra commentary.`;
  }

  const firstName = getFirstName(resumeContext, candidateName);
  const nameLine = firstName
    ? `\n- Name: ${firstName} (use their first name naturally in your greeting — NEVER use placeholders like [Candidate Name])`
    : `\n- Name: not provided (do NOT use [Candidate Name] or any bracket placeholder — just skip the name)`;
  const resumeSection = resumeContext
    ? `\nCandidate:${nameLine}\n- Recent Role: ${resumeContext.recent_role} at ${resumeContext.recent_company}\n- Experience: ${resumeContext.years_experience} years\n- Skills: ${(resumeContext.top_skills || []).join(", ")}\n- Background: ${resumeContext.summary}\n\nTailor your opening question to their specific background.`
    : `\nCandidate:${nameLine}`;
  const drillLine = drillFocus
    ? `\n\nDRILL: Open with a question that directly probes the candidate's weakness in: "${drillFocus}". Be natural — don't mention it's a drill.`
    : "";

  return `You are a real human interviewer on a Zoom call for a ${role} role.${resumeSection}${drillLine}${langLine}

Open the interview exactly like a real person would — casual, direct, no corporate-speak.

HARD RULES — breaking any of these is failure:
- NEVER say: "Great question!", "Excellent!", "Certainly!", "Of course!", "Absolutely!", "That's interesting!", "Sure thing!", "As an interviewer", "As an AI"
- Do NOT use exclamation marks for praise
- Do NOT introduce yourself formally — just start
- ONE question, max 2 sentences
- Output ONLY the question — nothing else`;
}

async function* streamQuestionChunks(role, userApiKey, resumeContext = null, isCodingRound = false, candidateName = null, drillFocus = null, language = "English") {
  const prompt = buildQuestionPrompt(role, resumeContext, isCodingRound, candidateName, drillFocus, language);
  const firstName = getFirstName(resumeContext, candidateName);
  const client = getAI(userApiKey);
  const stream = await client.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  for await (const chunk of stream) {
    const raw = typeof chunk.text === "function" ? chunk.text() : (chunk.text || "");
    if (raw) yield stripNamePlaceholders(raw, firstName);
  }
}

module.exports = {
  generateQuestion,
  streamQuestionChunks,
  buildQuestionPrompt,
  getLangInstruction,
  ai,
  getAI,
  getFirstName,
  stripNamePlaceholders,
  extractResponseText,
  hasUsableApiKey,
  mapGeminiError,
};
