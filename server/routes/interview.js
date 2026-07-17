const express = require("express");
const router = express.Router();

const { generateQuestion, streamQuestionChunks, hasUsableApiKey, mapGeminiError } = require("../ai/llm");
const { evaluateAnswer } = require("../ai/evaluate");
const { generateFollowUp, streamFollowUpChunks } = require("../ai/followUp");
const sessionService = require("../services/session");

const MAX_QUESTIONS = 5;

function sseSetup(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

function sseWrite(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// 1. START — streaming version (creates session + streams opening question)
router.post("/stream-start", async (req, res) => {
  const { role, clerkId, userApiKey, resumeContext, isCodingRound, candidateName, drillFocus, language } = req.body;
  if (!role) return res.status(400).json({ error: "Role is required" });
  if (!hasUsableApiKey(userApiKey)) return res.status(400).json({ error: "Gemini API key required." });

  sseSetup(res);

  try {
    const session = await sessionService.createSession(role, clerkId);
    sseWrite(res, { type: "session", sessionId: session.sessionId });

    let fullQuestion = "";
    const stream = streamQuestionChunks(role, userApiKey, resumeContext || null, !!isCodingRound, candidateName || null, drillFocus || null, language || "English");
    for await (const chunk of stream) {
      fullQuestion += chunk;
      sseWrite(res, { type: "chunk", text: chunk });
    }

    await sessionService.updateCurrentQuestion(session.sessionId, fullQuestion);
    sseWrite(res, { type: "done", fullQuestion });
    res.end();
  } catch (error) {
    console.error("stream-start error:", error);
    const mapped = mapGeminiError(error);
    sseWrite(res, { type: "error", error: mapped.error });
    res.end();
  }
});

// 2a. EVALUATE — scores the answer and saves to DB, returns evaluation + isComplete
router.post("/evaluate", async (req, res) => {
  try {
    const { sessionId, answer, userApiKey, isCodingRound, language } = req.body;
    if (!sessionId || !answer) return res.status(400).json({ error: "sessionId and answer are required" });

    const session = await sessionService.getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.status === "completed") return res.status(400).json({ error: "Session already completed." });

    const questionTheyAreAnswering = session.currentQuestion;
    const currentDifficulty = session.currentDifficulty || "Medium";

    const evaluation = await evaluateAnswer(questionTheyAreAnswering, answer, currentDifficulty, userApiKey, !!isCodingRound, language || "English");

    await sessionService.updateSessionData(
      sessionId,
      { question: questionTheyAreAnswering, answer, difficulty: currentDifficulty, evaluation },
      evaluation
    );

    const updatedSession = await sessionService.getSession(sessionId);
    const isComplete = updatedSession.history.length >= MAX_QUESTIONS;

    if (isComplete) await sessionService.endSession(sessionId);

    res.json({
      evaluation,
      isComplete,
      sessionSummary: updatedSession,
      nextDifficulty: updatedSession.currentDifficulty,
    });
  } catch (error) {
    console.error("evaluate error:", error);
    const mapped = mapGeminiError(error);
    res.status(mapped.status).json({ error: mapped.error });
  }
});

// 2b. STREAM-NEXT — streams the follow-up question after evaluate
router.post("/stream-next", async (req, res) => {
  const { sessionId, answer, userApiKey, resumeContext, isCodingRound, candidateName, evaluationScore, nextDifficulty, language } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });

  sseSetup(res);

  try {
    const session = await sessionService.getSession(sessionId);
    if (!session) { sseWrite(res, { type: "error", error: "Session not found" }); return res.end(); }

    let fullQuestion = "";
    const stream = streamFollowUpChunks(
      session.role,
      session.currentQuestion,
      answer || "",
      evaluationScore ?? 5,
      nextDifficulty || session.currentDifficulty || "Medium",
      userApiKey,
      !!isCodingRound,
      resumeContext || null,
      candidateName || null,
      language || "English"
    );

    for await (const chunk of stream) {
      fullQuestion += chunk;
      sseWrite(res, { type: "chunk", text: chunk });
    }

    await sessionService.updateCurrentQuestion(sessionId, fullQuestion);
    sseWrite(res, { type: "done", fullQuestion });
    res.end();
  } catch (error) {
    console.error("stream-next error:", error);
    const mapped = mapGeminiError(error);
    sseWrite(res, { type: "error", error: mapped.error });
    res.end();
  }
});

// 2. LEGACY — SUBMIT ANSWER, EVALUATE & NEXT (kept for backward compat)
router.post("/answer", async (req, res) => {
  try {
    const { sessionId, answer, userApiKey, resumeContext, isCodingRound, candidateName } = req.body;
    if (!sessionId || !answer) return res.status(400).json({ error: "sessionId and answer are required" });

    const session = await sessionService.getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found in DB" });
    if (session.status === "completed") return res.status(400).json({ error: "This interview session is already completed." });

    const questionTheyAreAnswering = session.currentQuestion;
    const currentDifficulty = session.currentDifficulty || "Medium";
    const evaluation = await evaluateAnswer(questionTheyAreAnswering, answer, currentDifficulty, userApiKey, !!isCodingRound);

    await sessionService.updateSessionData(
      sessionId,
      { question: questionTheyAreAnswering, answer, difficulty: currentDifficulty, evaluation },
      evaluation
    );

    const updatedSession = await sessionService.getSession(sessionId);
    if (updatedSession.history.length >= MAX_QUESTIONS) {
      await sessionService.endSession(sessionId);
      return res.json({ evaluation, isComplete: true, message: "Interview complete!", sessionSummary: updatedSession });
    }

    const nextQuestion = await generateFollowUp(
      updatedSession.role, questionTheyAreAnswering, answer,
      evaluation.score, updatedSession.currentDifficulty, userApiKey,
      !!isCodingRound, resumeContext || null, candidateName || null
    );
    await sessionService.updateCurrentQuestion(sessionId, nextQuestion);

    res.json({
      evaluation, isComplete: false, nextQuestion,
      currentQuestionNumber: updatedSession.history.length + 1,
      totalQuestions: MAX_QUESTIONS,
      sessionSummary: updatedSession,
    });
  } catch (error) {
    console.error("Error processing answer:", error);
    const mapped = mapGeminiError(error);
    res.status(mapped.status).json({ error: mapped.error });
  }
});

// 3. GET SESSION
router.get("/session/:id", async (req, res) => {
  try {
    const session = await sessionService.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// 4. GET ALL SESSIONS BY USER
router.get("/user/:clerkId", async (req, res) => {
  try {
    const sessions = await sessionService.getSessionsByUser(req.params.clerkId);
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user profiles" });
  }
});

// 5. DELETE SESSION
router.delete("/session/:id", async (req, res) => {
  try {
    const deleted = await sessionService.deleteSession(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Session not found" });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

module.exports = router;
