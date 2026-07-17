const { v4: uuidv4 } = require("uuid");
const SessionModel = require("../models/session.model");

async function createSession(role, clerkId = null) {
  const sessionId = uuidv4();
  const session = new SessionModel({
    sessionId,
    clerkId,
    role,
    history: [],
    status: "active",
    currentDifficulty: "Medium",
    globalStrengths: [],
    globalWeaknesses: []
  });
  await session.save();
  return session;
}

async function getSession(sessionId) {
  return await SessionModel.findOne({ sessionId });
}

async function updateSessionData(sessionId, historyItem, evaluation) {
  const session = await SessionModel.findOne({ sessionId });
  if (!session) return null;

  const newStrengths = [...new Set([...session.globalStrengths, ...(evaluation.detected_strengths || [])])];
  const newWeaknesses = [...new Set([...session.globalWeaknesses, ...(evaluation.detected_weaknesses || [])])];
  const nextDifficulty = evaluation.suggested_next_difficulty || session.currentDifficulty;

  return await SessionModel.findOneAndUpdate(
    { sessionId },
    { 
      $push: { history: historyItem },
      $set: { 
        currentDifficulty: nextDifficulty,
        globalStrengths: newStrengths,
        globalWeaknesses: newWeaknesses
      }
    },
    { returnDocument: 'after' }
  );
}

async function updateCurrentQuestion(sessionId, currentQuestion) {
  return await SessionModel.findOneAndUpdate(
    { sessionId },
    { currentQuestion: currentQuestion },
    { returnDocument: 'after' }
  );
}

async function endSession(sessionId) {
  return await SessionModel.findOneAndUpdate(
    { sessionId },
    { status: "completed" },
    { returnDocument: 'after' }
  );
}

async function getSessionsByUser(clerkId) {
  return await SessionModel.find({ clerkId }).sort({ createdAt: -1 });
}

async function deleteSession(sessionId) {
  return await SessionModel.findOneAndDelete({ sessionId });
}

module.exports = { createSession, getSession, updateSessionData, updateCurrentQuestion, endSession, getSessionsByUser, deleteSession };
