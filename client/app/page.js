"use client"

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Zap, ShieldAlert,
  Mic, MicOff, Rocket, Lightbulb, Target, Brain, Activity,
  Download, Upload, CheckCircle, Code2, Key, X,
} from "lucide-react";
import { getApiBase } from "@/lib/api";
import { APP_NAME, loadGeminiKey, saveGeminiKey } from "@/lib/brand";
import { toast } from "@/lib/toast";
import { speak as ttsSpeak, cancelSpeech, loadElevenLabsKey, saveElevenLabsKey } from "@/lib/tts";
import { DeepgramSTT, loadDeepgramKey, saveDeepgramKey } from "@/lib/deepgramSTT";
import CompanyPicker from "@/components/CompanyPicker";
import InterviewerAvatar from "@/components/InterviewerAvatar";
import { getCompany } from "@/lib/companies";
import { useAuth, useUser, SignInButton, UserButton } from "@clerk/nextjs";
import dynamic from "next/dynamic";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), { ssr: false });

// ─── ShapeGrid (canvas) ───────────────────────────────────────────────────────
function ShapeGrid() {
  const ref = useRef(null);
  const mouse = useRef({ x: -999, y: -999 });
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const onMouse = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMouse);
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const cell = 58, gap = 2;
      const cols = Math.ceil(c.width / (cell + gap));
      const rows = Math.ceil(c.height / (cell + gap));
      for (let r = 0; r < rows; r++) {
        for (let cl = 0; cl < cols; cl++) {
          const cx = cl * (cell + gap) + cell / 2;
          const cy = r * (cell + gap) + cell / 2;
          const dx = mouse.current.x - cx, dy = mouse.current.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const inf = Math.max(0, 1 - dist / 140);
          const a = 0.055 + inf * 0.35;
          const s = (cell * 0.3) * (1 + inf * 0.5);
          ctx.save(); ctx.translate(cx, cy);
          ctx.globalAlpha = a;
          ctx.fillStyle = "#fff";
          const t = (r + cl) % 3;
          if (t === 0) { ctx.fillRect(-s / 2, -s / 2, s, s); }
          else if (t === 1) { ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.fill(); }
          else { ctx.beginPath(); ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, 0); ctx.lineTo(0, s / 2); ctx.lineTo(-s / 2, 0); ctx.closePath(); ctx.fill(); }
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMouse); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", display: "block" }} />;
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
function TypewriterText({ text, delay = 18 }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut(""); let i = 0;
    const id = setInterval(() => { setOut(p => p + text.charAt(i)); i++; if (i >= text.length) clearInterval(id); }, delay);
    return () => clearInterval(id);
  }, [text]);
  return <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "rgba(255,255,255,0.88)" }}>{out}</p>;
}

// ─── Small metre bar ─────────────────────────────────────────────────────────
function Meter({ label, value }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
        <span>{label}</span><span style={{ fontFamily: "monospace" }}>{Math.floor(value)}%</span>
      </div>
      <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 99 }}>
        <div style={{ width: `${value}%`, height: "100%", background: "rgba(255,255,255,0.6)", borderRadius: 99, transition: "width .4s" }} />
      </div>
    </div>
  );
}

// ─── Shared panel style ───────────────────────────────────────────────────────
const panel = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, backdropFilter: "blur(20px)" };
const label = { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 6, display: "block" };
const inputStyle = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#fff", outline: "none", boxSizing: "border-box" };

// ─── Chat message with ideal-answer toggle ────────────────────────────────────
function ChatMessage({ msg, isLast, isTyping }) {
  const [showIdeal, setShowIdeal] = useState(false);
  const ev = msg.evaluation;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", justifyContent: msg.role === "ai" ? "flex-start" : "flex-end", paddingLeft: msg.isFollowUp ? 24 : 0 }}>
      <div style={{ maxWidth: "82%", borderRadius: msg.role === "ai" ? "4px 18px 18px 18px" : "18px 4px 18px 18px", padding: "14px 18px", background: msg.role === "ai" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)", border: `1px solid rgba(255,255,255,${msg.role === "ai" ? "0.07" : "0.13"})`, fontSize: 13, lineHeight: 1.65 }}>
        {msg.role === "ai" && isLast && !ev && !isTyping
          ? <TypewriterText text={msg.text} />
          : <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.text}</p>}
        {ev && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Neural Score</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: ev.score >= 7 ? "#fff" : "rgba(255,255,255,0.5)" }}>{ev.score}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>/10</span></span>
            </div>
            <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 99, marginBottom: 8 }}>
              <div style={{ width: `${ev.score * 10}%`, height: "100%", background: "#fff", borderRadius: 99 }} />
            </div>
            {ev.time_complexity && (
              <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>T: {ev.time_complexity}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>S: {ev.space_complexity}</span>
              </div>
            )}
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>{ev.suggestions}</p>
            {ev.ideal_answer && (
              <>
                <button onClick={() => setShowIdeal(p => !p)}
                  style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {showIdeal ? "Hide" : "Show"} ideal answer
                </button>
                {showIdeal && (
                  <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                    {ev.ideal_answer}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Landing hero ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Brain, title: "Adaptive difficulty", desc: "Questions get harder or easier in real time based on how you answer." },
  { icon: Target, title: "Company-tailored", desc: "Practice the real interview style of 60+ companies, or go role-agnostic." },
  { icon: Mic, title: "Voice or text", desc: "Speak naturally with live transcription, or type — your call." },
  { icon: Zap, title: "Instant feedback", desc: "Get a scored debrief with an ideal-answer breakdown after every session." },
];

function LandingHero({ onStart }) {
  return (
    <motion.div key="landing-hero"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }}
      style={{ width: "100%", maxWidth: 780, textAlign: "center" }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 18px" }}>
        AI-powered interview simulation
      </p>
      <h1 style={{ fontSize: "clamp(34px, 6vw, 58px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.08, margin: "0 0 20px" }}>
        Interview practice that<br />actually adapts to you.
      </h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 40px" }}>
        A live AI interviewer that tunes question difficulty to your answers, matches a real company's style, and gives you a scored, ideal-answer debrief the moment you finish.
      </p>

      <button onClick={onStart}
        style={{ padding: "17px 40px", borderRadius: 14, border: "none", cursor: "pointer", background: "#fff", color: "#000", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 56 }}>
        <Rocket size={16} /> Start Interview
      </button>

      <div className="feature-grid">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} style={{ ...panel, padding: "22px 20px", textAlign: "left" }}>
            <Icon size={18} color="rgba(255,255,255,0.6)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>{title}</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── SSE streaming helper ─────────────────────────────────────────────────────
async function readSSEStream(url, body, onChunk, onSession, onDone, onError) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    onError?.("Could not reach the server. Wait a moment and try again.");
    return;
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Stream failed" }));
    onError?.(err.error || "Stream failed");
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "session") onSession?.(data.sessionId);
        else if (data.type === "chunk") onChunk?.(data.text);
        else if (data.type === "done") onDone?.(data.fullQuestion);
        else if (data.type === "error") onError?.(data.error);
      } catch {}
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();

  const [stage, setStage] = useState("landing");
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [role, setRole] = useState("");
  const [persona, setPersona] = useState("Harsh Tech Lead");
  const [company, setCompany] = useState("Agnostic");
  const [interviewType, setInterviewType] = useState("Technical");
  const [timerMode, setTimerMode] = useState("Pressure Mode");

  const [sessionId, setSessionId] = useState("");
  const [userApiKey, setUserApiKey] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeContext, setResumeContext] = useState(null);
  const [isParsingResume, setIsParsingResume] = useState(false);

  const getCandidateName = () =>
    resumeContext?.name ||
    user?.firstName ||
    user?.fullName?.split(" ")[0] ||
    null;

  const [codeLanguage, setCodeLanguage] = useState("javascript");

  // After Clerk loads and user is signed in, check if we already have their key in sessionStorage.
  // If not, redirect them to the API Key entry screen.
  useEffect(() => {
    if (!isLoaded) return;
    if (userId) {
      const saved = loadGeminiKey();
      if (saved) setUserApiKey(saved);
      const el = loadElevenLabsKey(); if (el) { setElevenLabsKey(el); setElInput(el); }
      const dg = loadDeepgramKey();   if (dg) { setDeepgramKey(dg);   setDgInput(dg); }
      const drillRaw = sessionStorage.getItem("nexus_drill_context");
      if (drillRaw) { try { setDrillMode(JSON.parse(drillRaw)); } catch {} sessionStorage.removeItem("nexus_drill_context"); }
    }
  }, [isLoaded, userId]);

  const playTone = (freq = 880, dur = 0.08) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch {}
  };
  const [currentDifficulty, setCurrentDifficulty] = useState("Medium");
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [answer, setAnswer] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [finalSummary, setFinalSummary] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [liveClarity, setLiveClarity] = useState(0);
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);

  const [language, setLanguage] = useState("English"); // "English" | "Hindi" | "Hinglish"
  const [drillMode, setDrillMode] = useState(null); // { weakness, drillQuestion }

  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [deepgramKey, setDeepgramKey] = useState("");
  const [elInput, setElInput] = useState("");
  const [dgInput, setDgInput] = useState("");
  const [showVoiceKeys, setShowVoiceKeys] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const chatEndRef = useRef(null);
  const deepgramRef = useRef(null);
  const audioCtxRef = useRef(null);
  const dgInterimRef = useRef("");
  const timerRef = useRef(null);

  // Voice setup — browser SR as fallback
  useEffect(() => {
    if (typeof window === "undefined") return;
    synthRef.current = window.speechSynthesis;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR(); r.continuous = true; r.interimResults = true;
    r.onresult = (e) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; setAnswer(t); };
    r.onerror = () => setIsRecording(false); r.onend = () => setIsRecording(false);
    recognitionRef.current = r;
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      if (deepgramRef.current) {
        deepgramRef.current.stop();
        deepgramRef.current = null;
        setAnswer(prev => prev + (dgInterimRef.current ? " " + dgInterimRef.current : ""));
        dgInterimRef.current = "";
      } else if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      setAnswer("");
      dgInterimRef.current = "";
      if (deepgramKey?.trim().length > 10) {
        const dg = new DeepgramSTT(deepgramKey.trim());
        deepgramRef.current = dg;
        dg.start({
          onInterim: (t) => { dgInterimRef.current = t; setAnswer(dgInterimRef.current); },
          onFinal: (t) => { dgInterimRef.current = ""; setAnswer(prev => (prev + " " + t).trim()); },
          onError: (e) => { console.warn("Deepgram:", e); deepgramRef.current = null; setIsRecording(false); },
        });
        setIsRecording(true);
      } else if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
      } else {
        toast.error("Use Chrome/Edge for voice, or add a Deepgram key for cross-browser support.");
      }
    }
  };

  const speak = (text) => {
    ttsSpeak(text, persona, elevenLabsKey, {
      onStart: () => setIsAiSpeaking(true),
      onEnd:   () => setIsAiSpeaking(false),
    }, language);
  };

  // Live meters
  useEffect(() => {
    if (!answer.trim()) { setLiveClarity(0); setLiveConfidence(0); return; }
    const words = answer.trim().split(/\s+/).length;
    setLiveClarity(Math.min(100, words * 2.5));
    const h = (answer.match(/\b(hmm|uh|um|maybe|probably|guess)\b/gi) || []).length;
    setLiveConfidence(Math.max(0, Math.min(100, words * 2 - h * 15)));
  }, [answer]);

  // Timer with audio cues
  useEffect(() => {
    if (stage !== "interview" || isTyping || timerMode === "Practice Mode") return;
    const start = timerMode === "Rapid Fire" ? 30 : 120; setTimeLeft(start);
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(timerRef.current); submitAnswer("Time up."); return 0; }
        if (p === 30) playTone(440, 0.18);          // 30s warning — low tick
        else if (p <= 10) playTone(660, 0.07);      // last 10s — faster ticking
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [stage, isTyping, chatHistory.length, timerMode]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isTyping, streamingText]);

  const apiBase = getApiBase();
  const isCodingRound = interviewType === "Coding Round";

  // ─── Config modal open/close ─────────────────────────────────────────────
  const openConfig = () => {
    setShowConfig(true);
    setStage(userId && !userApiKey ? "api-key" : "role-selection");
  };
  const closeConfig = () => { setShowConfig(false); setStage("landing"); };

  // ─── Change API key ──────────────────────────────────────────────────────
  const handleChangeKey = () => { setApiKeyInput(""); setApiKeyError(""); setShowKeyModal(true); };
  const confirmNewKey = () => {
    if (apiKeyInput.trim().length < 10) { setApiKeyError("That doesn't look like a valid API key."); return; }
    saveGeminiKey(apiKeyInput.trim());
    setUserApiKey(apiKeyInput.trim());
    setShowKeyModal(false);
    setApiKeyInput("");
    setApiKeyError("");
  };

  const handleResumeUpload = async (file) => {
    if (!file) return;
    setResumeFile(file);
    setIsParsingResume(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("userApiKey", userApiKey);
      const res = await axios.post(`${apiBase}/resume/parse`, formData, { timeout: 60000 });
      setResumeContext(res.data.context);
    } catch (e) {
      console.error("Resume parse failed:", e);
      setResumeContext(null);
    } finally {
      setIsParsingResume(false);
    }
  };

  const downloadReport = async () => {
    if (!finalSummary) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text(`${APP_NAME} — Interview Report`, W / 2, y, { align: "center" }); y += 10;

    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`${company} · ${interviewType} · ${new Date().toLocaleDateString()}`, W / 2, y, { align: "center" });
    y += 8;
    doc.text(`Role: ${role}`, W / 2, y, { align: "center" });
    y += 14;

    doc.setTextColor(0);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Peak Difficulty: ${finalSummary.currentDifficulty}   Avg Score: ${
      finalSummary.history.length
        ? (finalSummary.history.reduce((a, h) => a + (h?.evaluation?.score || 0), 0) / finalSummary.history.length).toFixed(1)
        : "—"
    }/10   Questions: ${finalSummary.history.length}`, 14, y);
    y += 12;

    doc.setDrawColor(220); doc.line(14, y, W - 14, y); y += 10;

    finalSummary.history.forEach((item, idx) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
      doc.text(`Q${idx + 1} [${item.difficulty || "Medium"}] — Score: ${item?.evaluation?.score ?? "—"}/10`, 14, y); y += 7;

      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(40);
      const qLines = doc.splitTextToSize(`Question: ${item.question}`, W - 28);
      doc.text(qLines, 14, y); y += qLines.length * 5 + 3;

      const aLines = doc.splitTextToSize(`Answer: ${item.answer}`, W - 28);
      doc.text(aLines, 14, y); y += aLines.length * 5 + 3;

      if (item?.evaluation?.suggestions) {
        doc.setTextColor(80);
        const sLines = doc.splitTextToSize(`Tip: ${item.evaluation.suggestions}`, W - 28);
        doc.text(sLines, 14, y); y += sLines.length * 5 + 3;
      }
      if (item?.evaluation?.ideal_answer) {
        doc.setTextColor(60);
        const iLines = doc.splitTextToSize(`Ideal: ${item.evaluation.ideal_answer}`, W - 28);
        doc.text(iLines, 14, y); y += iLines.length * 5 + 3;
      }
      if (item?.evaluation?.time_complexity) {
        doc.setTextColor(80);
        doc.text(`Time: ${item.evaluation.time_complexity}  Space: ${item.evaluation.space_complexity}`, 14, y); y += 6;
      }
      doc.setDrawColor(230); doc.line(14, y, W - 14, y); y += 8;
    });

    if (finalSummary.globalStrengths?.length || finalSummary.globalWeaknesses?.length) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
      doc.text("Overall Profile", 14, y); y += 8;
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      (finalSummary.globalStrengths || []).forEach(s => { doc.setTextColor(40); doc.text(`+ ${s}`, 18, y); y += 5; });
      (finalSummary.globalWeaknesses || []).forEach(w => { doc.setTextColor(100); doc.text(`— ${w}`, 18, y); y += 5; });
    }

    doc.save(`nexus-ai-report-${Date.now()}.pdf`);
  };

  const startInterview = async () => {
    if (!role || !userId) return;
    setIsTyping(true);
    setStreamingText("");
    setChatHistory([]);
    setStage("interview");
    const co = getCompany(company);
    const companyLabel = company === "Agnostic" ? "a tech company" : company;
    const ctx = `A ${persona} acting as a ${interviewType} interviewer at ${companyLabel} (${co.tagline}), for a ${role} position.`;
    let accum = "";
    try {
      await readSSEStream(
        `${apiBase}/interview/stream-start`,
        { role: ctx, clerkId: userId, userApiKey, resumeContext: resumeContext || undefined, isCodingRound, candidateName: getCandidateName() || undefined, drillFocus: drillMode?.weakness || undefined, language },
        (chunk) => { accum += chunk; setStreamingText(accum); },
        (sid) => { setSessionId(sid); setCurrentDifficulty("Medium"); },
        (fullQuestion) => {
          setStreamingText("");
          setChatHistory([{ role: "ai", text: fullQuestion, isInitial: true }]);
          if (!isCodingRound) speak(fullQuestion);
        },
        (err) => {
          const onLiveSite = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");
          const missingApiUrl = onLiveSite && apiBase.includes("localhost");
          const msg = missingApiUrl
            ? "Backend not configured. Set NEXT_PUBLIC_API_URL on Vercel to your Render URL, then redeploy."
            : err || "Could not reach the server. Render may be waking up (~60s on free tier). Wait a moment and try again.";
          toast.error(msg);
          setStage("role-selection");
        }
      );
    } catch (err) {
      toast.error("Could not reach the server. Wait a moment and try again.");
      setStage("role-selection");
    } finally {
      setIsTyping(false);
    }
  };

  const submitAnswer = async (forced = null) => {
    if (isRecording) toggleRecording();
    cancelSpeech();
    const userAns = forced || answer;
    if (!userAns.trim()) return;
    clearInterval(timerRef.current);
    const hist = [...chatHistory, { role: "user", text: userAns }];
    setChatHistory(hist);
    setAnswer("");
    setIsTyping(true);
    setStreamingText("");
    setTimeout(() => setIsAdjusting(true), 1200);
    try {
      // Step 1: fast evaluation (JSON)
      const res = await axios.post(
        `${apiBase}/interview/evaluate`,
        { sessionId, answer: userAns, userApiKey, isCodingRound, language },
        { timeout: 90000 }
      );
      const { evaluation, isComplete, sessionSummary, nextDifficulty } = res.data;
      const withEval = [...hist];
      withEval[withEval.length - 1].evaluation = evaluation;
      setChatHistory(withEval);
      setIsAdjusting(false);
      if (sessionSummary) {
        setStrengths(sessionSummary.globalStrengths || []);
        setWeaknesses(sessionSummary.globalWeaknesses || []);
        setCurrentDifficulty(sessionSummary.currentDifficulty || "Medium");
      }
      if (isComplete) {
        setFinalSummary(sessionSummary);
        setStage("debrief");
        setIsTyping(false);
        return;
      }
      // Step 2: stream next question
      let accum = "";
      await readSSEStream(
        `${apiBase}/interview/stream-next`,
        { sessionId, answer: userAns, userApiKey, resumeContext: resumeContext || undefined, isCodingRound, candidateName: getCandidateName() || undefined, evaluationScore: evaluation.score, nextDifficulty: nextDifficulty || currentDifficulty, language },
        (chunk) => { accum += chunk; setStreamingText(accum); },
        null,
        (fullQuestion) => {
          setStreamingText("");
          setChatHistory(prev => [...prev, { role: "ai", text: fullQuestion, isFollowUp: true }]);
          if (!isCodingRound) speak(fullQuestion);
        },
        (err) => { toast.error(err || "Could not get next question. Try again."); }
      );
    } catch (err) {
      const isNetwork = !err.response;
      const msg = isNetwork
        ? "Could not reach the server. Render may be waking up — wait ~60s and try again."
        : err.response?.data?.error || `Server error ${err.response?.status || ""}`.trim();
      toast.error(msg);
      setChatHistory(hist.slice(0, -1));
      setAnswer(userAns);
      setIsAdjusting(false);
    } finally {
      setIsTyping(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <ShapeGrid />

      {/* ── Change Key Modal ── */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div key="key-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowKeyModal(false); }}
          >
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              style={{ ...panel, padding: "36px 32px", width: "100%", maxWidth: 420, position: "relative" }}>
              <button onClick={() => setShowKeyModal(false)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 4 }}>
                <X size={16} />
              </button>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>Change Gemini Key</h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 24px", lineHeight: 1.6 }}>Your current key will be replaced for this session.</p>
              <input type="password" value={apiKeyInput}
                onChange={e => { setApiKeyInput(e.target.value); setApiKeyError(""); }}
                onKeyDown={e => e.key === "Enter" && confirmNewKey()}
                placeholder="AIzaSy..." autoFocus
                style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: 8 }}
              />
              {apiKeyError && <p style={{ fontSize: 11, color: "rgba(255,80,80,0.85)", marginBottom: 12 }}>{apiKeyError}</p>}
              <button onClick={confirmNewKey}
                style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", cursor: "pointer", background: apiKeyInput.trim().length > 10 ? "#fff" : "rgba(255,255,255,0.1)", color: apiKeyInput.trim().length > 10 ? "#000" : "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>
                Update Key →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Config Modal (Start Interview flow) ── */}
      <AnimatePresence>
        {showConfig && (stage === "api-key" || stage === "role-selection") && (
          <motion.div key="config-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}
            onClick={(e) => { if (e.target === e.currentTarget) closeConfig(); }}
          >
            {stage === "api-key" && (
              <motion.div key="api-key" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
                style={{ width: "100%", maxWidth: 460, margin: "auto" }}
              >
                <div style={{ ...panel, padding: "44px 40px", textAlign: "center", position: "relative" }}>
                  <button onClick={closeConfig} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 4 }}>
                    <X size={16} />
                  </button>
                  {/* Icon */}
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 28 }}>
                    🔑
                  </div>

                  <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Connect Your AI</h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.6, margin: "0 0 32px" }}>
                    Paste your free Gemini API key to power your interview simulation.<br />
                    Your key is <strong style={{ color: "rgba(255,255,255,0.6)" }}>never stored</strong> on our servers.
                  </p>

                  {/* Key Input */}
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={e => { setApiKeyInput(e.target.value); setApiKeyError(""); }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        if (apiKeyInput.trim().length < 10) { setApiKeyError("That doesn't look like a valid API key."); return; }
                        saveGeminiKey(apiKeyInput);
                        setUserApiKey(apiKeyInput.trim());
                        setStage("role-selection");
                      }
                    }}
                    placeholder="AIzaSy..."
                    style={{ ...inputStyle, textAlign: "center", fontSize: 13, padding: "14px 16px", fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: 8 }}
                    autoFocus
                  />
                  {apiKeyError && <p style={{ fontSize: 11, color: "rgba(255,80,80,0.85)", marginBottom: 12 }}>{apiKeyError}</p>}

                  {/* CTA */}
                  <button
                    onClick={() => {
                      if (apiKeyInput.trim().length < 10) { setApiKeyError("That doesn't look like a valid API key."); return; }
                      saveGeminiKey(apiKeyInput);
                      setUserApiKey(apiKeyInput.trim());
                      setStage("role-selection");
                    }}
                    style={{ width: "100%", padding: "14px 0", borderRadius: 11, border: "none", cursor: apiKeyInput.trim().length > 10 ? "pointer" : "not-allowed", background: apiKeyInput.trim().length > 10 ? "#fff" : "rgba(255,255,255,0.1)", color: apiKeyInput.trim().length > 10 ? "#000" : "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", transition: "all .2s", marginBottom: 20 }}>
                    Activate Simulation Engine →
                  </button>

                  {/* Helper link */}
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.6 }}>
                    Don't have one?{" "}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                      style={{ color: "rgba(255,255,255,0.5)", textDecoration: "underline" }}>
                      Get a free key at aistudio.google.com
                    </a>
                    {" "}— 1,500 requests/day, no credit card.
                  </p>

                  {/* Reassurance badges */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 20, marginBottom: 20 }}>
                    {["🔒 Client-side only", "🚫 Never logged", "♻️ Cached for session"].map(t => (
                      <span key={t} style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{t}</span>
                    ))}
                  </div>

                  {/* Optional premium voice keys */}
                  <button onClick={() => setShowVoiceKeys(p => !p)}
                    style={{ width: "100%", background: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 11, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>🎙 Optional: Premium Voice (ElevenLabs + Deepgram)</span>
                    <span style={{ fontSize: 10 }}>{showVoiceKeys ? "▲" : "▼"}</span>
                  </button>
                  {showVoiceKeys && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", margin: "0 0 4px", lineHeight: 1.6 }}>
                        Leave blank to use free browser TTS/STT. Add keys for human-quality AI voice and cross-browser mic support.
                      </p>
                      <input type="password" value={elInput} onChange={e => setElInput(e.target.value)} onBlur={() => { if (elInput.trim().length > 10) { setElevenLabsKey(elInput.trim()); saveElevenLabsKey(elInput.trim()); }}}
                        placeholder="ElevenLabs API key (optional)"
                        style={{ ...inputStyle, fontSize: 12, padding: "10px 14px", fontFamily: "monospace" }} />
                      <input type="password" value={dgInput} onChange={e => setDgInput(e.target.value)} onBlur={() => { if (dgInput.trim().length > 10) { setDeepgramKey(dgInput.trim()); saveDeepgramKey(dgInput.trim()); }}}
                        placeholder="Deepgram API key (optional)"
                        style={{ ...inputStyle, fontSize: 12, padding: "10px 14px", fontFamily: "monospace" }} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {stage === "role-selection" && (
              <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
                style={{ width: "100%", maxWidth: 520, margin: "auto" }}
              >
                <div style={{ ...panel, padding: "36px 32px", position: "relative" }}>
                  <button onClick={closeConfig} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 4 }}>
                    <X size={16} />
                  </button>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", margin: "0 0 6px" }}>Configure session</p>
                    <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>Build your interview</h2>
                  </div>

                  <div style={{ marginBottom: 22 }}>
                    <CompanyPicker value={company} onChange={setCompany} />
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", margin: "8px 0 0", textAlign: "center" }}>
                      {getCompany(company).tagline} — questions match {company === "Agnostic" ? "your role" : `${getCompany(company).name}'s style`}
                    </p>
                  </div>

                  {/* Interview type tabs */}
                  <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 4, marginBottom: 20, flexWrap: "wrap", gap: 2 }}>
                    {["Technical", "HR & Culture", "System Design", "Coding Round"].map(t => (
                      <button key={t} onClick={() => setInterviewType(t)} style={{ flex: 1, minWidth: 72, padding: "9px 4px", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 9, border: "none", cursor: "pointer", background: interviewType === t ? "#fff" : "transparent", color: interviewType === t ? "#000" : "rgba(255,255,255,0.33)", transition: "all .2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        {t === "Coding Round" && <Code2 size={10} />}{t}
                      </button>
                    ))}
                  </div>

                  {/* Role input */}
                  <div style={{ marginBottom: 14 }}>
                    <span style={label}>Job you're interviewing for</span>
                    <input
                      type="text" value={role}
                      onChange={e => setRole(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && startInterview()}
                      placeholder="e.g. Senior DevOps Engineer"
                      style={{ ...inputStyle, fontSize: 14, padding: "13px 16px" }}
                    />
                  </div>

                  {/* Tone + Timer + Language */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                    {[
                      { lbl: "Interviewer style", val: persona, set: setPersona, opts: [["Harsh Tech Lead","Strict & direct"], ["Friendly Microsoft HR","Warm & structured"], ["Chaotic Startup Founder","Fast & casual"]] },
                      { lbl: "Pace", val: timerMode, set: setTimerMode, opts: [["Practice Mode","No timer"], ["Pressure Mode","2 min / Q"], ["Rapid Fire","30 sec / Q"]] },
                      { lbl: "Language", val: language, set: setLanguage, opts: [["English","English only"], ["Hinglish","Hindi + English mix"], ["Hindi","Full Hindi"]] },
                    ].map(({ lbl, val, set, opts }) => (
                      <div key={lbl}>
                        <span style={label}>{lbl}</span>
                        <select value={val} onChange={e => set(e.target.value)} style={{ ...inputStyle, padding: "9px 12px", fontSize: 11 }}>
                          {opts.map(([v, l]) => <option key={v} value={v} style={{ background: "#111" }}>{l}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Resume upload */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${resumeContext ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, cursor: "pointer", transition: "all .2s" }}>
                      <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handleResumeUpload(e.target.files[0])} />
                      {isParsingResume
                        ? <Loader2 size={14} color="rgba(255,255,255,0.5)" style={{ animation: "spin 1s linear infinite" }} />
                        : resumeContext
                        ? <CheckCircle size={14} color="rgba(255,255,255,0.7)" />
                        : <Upload size={14} color="rgba(255,255,255,0.35)" />}
                      <span style={{ fontSize: 12, color: resumeContext ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>
                        {isParsingResume ? "Reading your resume…"
                          : resumeContext ? `Resume loaded — ${resumeContext.recent_role || "profile ready"}`
                          : "Upload resume PDF — questions tailored to you"}
                      </span>
                    </label>
                  </div>

                  {/* Drill mode banner */}
                  {drillMode && (
                    <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.25)", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(129,140,248,0.7)", margin: "0 0 2px" }}>Drill Mode Active</p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>{drillMode.weakness}</p>
                      </div>
                      <button onClick={() => setDrillMode(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 11 }}>✕</button>
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={startInterview}
                    disabled={!role || isTyping || !userId || !userApiKey}
                    style={{ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", cursor: (!role || !userId || isTyping || !userApiKey) ? "not-allowed" : "pointer", background: (!role || !userId || isTyping || !userApiKey) ? "rgba(255,255,255,0.1)" : drillMode ? "rgba(129,140,248,0.9)" : "#fff", color: (!role || !userId || isTyping || !userApiKey) ? "rgba(255,255,255,0.35)" : "#000", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}>
                    {isTyping ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> :
                      !userId ? <><ShieldAlert size={14} /> Sign in to start</> :
                      !userApiKey ? <><span style={{ fontSize: 13 }}>🔑</span> Add Gemini API key</> :
                      drillMode ? <><Target size={14} /> Start Drill →</> :
                      <><Rocket size={14} /> Enter the interview room</>}
                  </button>

                  {userId && userApiKey && role && (
                    <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 12, fontFamily: "monospace" }}>
                      {getCompany(company).name} · {interviewType} · 5 questions · ~15 min
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 64, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(5,5,5,0.8)", backdropFilter: "blur(20px)" }}>
        <span style={{ fontWeight: 900, letterSpacing: "0.18em", fontSize: 13, textTransform: "uppercase" }}>NEXUS<span style={{ color: "rgba(255,255,255,0.3)" }}>.AI</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isLoaded && !userId && (
            <div style={{ border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "8px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>
              <SignInButton mode="modal" />
            </div>
          )}
          {isLoaded && userId && (
            <>
              <button onClick={() => window.location.href = "/mentor"} className="nav-txt-btn">Mentor →</button>
              <button onClick={() => window.location.href = "/profile"} className="nav-txt-btn">History →</button>
              {userApiKey && (
                <button onClick={handleChangeKey} title="Change Gemini API Key"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 10px", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <Key size={13} />
                </button>
              )}
              <UserButton />
            </>
          )}
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px 40px" }}>
        <AnimatePresence mode="wait">

          {/* ══ HERO LANDING ═══════════════════════════════════════════════════ */}
          {(stage === "landing" || stage === "api-key" || stage === "role-selection") && (
            <LandingHero onStart={openConfig} />
          )}

          {/* ══ INTERVIEW ════════════════════════════════════════════════════ */}
          {stage === "interview" && (
            <motion.div key="interview"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ width: "100%", maxWidth: 1100 }}
              className="interview-grid"
            >
              {/* Chat */}
              <div style={{ ...panel, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <InterviewerAvatar persona={persona} isSpeaking={isAiSpeaking} isListening={isRecording} />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{persona}</p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>{interviewType} · {company}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.2)", color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>{currentDifficulty}</span>
                    {timerMode !== "Practice Mode" && (
                      <span className={timeLeft <= 10 ? "timer-urgent" : ""} style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 8, border: `1px solid ${timeLeft <= 15 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.1)"}`, color: timeLeft <= 15 ? "#fff" : "rgba(255,255,255,0.45)" }}>
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {chatHistory.map((msg, i) => (
                    <ChatMessage key={i} msg={msg} isLast={i === chatHistory.length - 1} isTyping={isTyping} />
                  ))}
                  {/* Live streaming bubble */}
                  {streamingText && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ maxWidth: "82%", borderRadius: "4px 18px 18px 18px", padding: "14px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 13, lineHeight: 1.65 }}>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "rgba(255,255,255,0.88)" }}>
                          {streamingText}<span className="cursor-blink">▌</span>
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Evaluating indicator (only while waiting for eval response, not while streaming) */}
                  {isTyping && !streamingText && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "4px 18px 18px 18px", padding: "12px 18px", width: "fit-content" }}>
                        {[0, 100, 200].map(d => <div key={d} className="bounce-dot" style={{ width: 5, height: d === 100 ? 14 : 8, background: "rgba(255,255,255,0.4)", borderRadius: 3, animationDelay: `${d}ms` }} />)}
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginLeft: 6 }}>Evaluating</span>
                      </div>
                      {isAdjusting && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", fontStyle: "italic", marginLeft: 12 }}>Adjusting difficulty...</p>}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Hint bar */}
                <div style={{ padding: "8px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", display: "flex", gap: 8, alignItems: "center" }}>
                  <Lightbulb size={11} />
                  {interviewType === "Technical" && "FORMAT: 1. Concept  2. Implementation  3. Edge Cases"}
                  {interviewType === "System Design" && "FORMAT: 1. Requirements  2. Architecture  3. Bottlenecks"}
                  {interviewType === "HR & Culture" && "STAR: Situation → Task → Action → Result"}
                  {interviewType === "Coding Round" && "Write your solution then hit Submit — AI grades correctness, time & space complexity"}
                </div>

                {/* Input */}
                <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)", display: "flex", gap: 10, alignItems: "flex-end" }}>
                  {!isCodingRound && (
                    <button onClick={toggleRecording} style={{ width: 46, height: 46, borderRadius: 12, border: `1px solid ${isRecording ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}`, background: isRecording ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", color: isRecording ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isRecording ? <Mic size={18} /> : <MicOff size={18} />}
                    </button>
                  )}
                  <div style={{ flex: 1, position: "relative" }}>
                    {isCodingRound ? (
                      <div style={{ paddingBottom: 44 }}>
                        <CodeEditor value={answer} onChange={setAnswer} language={codeLanguage} onLanguageChange={setCodeLanguage} />
                      </div>
                    ) : (
                      <textarea value={answer} onChange={e => setAnswer(e.target.value)}
                        placeholder={isRecording ? "Listening…" : "Type your answer…"}
                        rows={2}
                        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "11px 50px 11px 14px", fontSize: 13, color: "#fff", fontFamily: "monospace", outline: "none", resize: "none", boxSizing: "border-box" }} />
                    )}
                    <button onClick={() => submitAnswer()} disabled={!answer.trim() || isTyping}
                      style={{ position: "absolute", right: 8, bottom: 8, width: 34, height: 34, borderRadius: 8, background: answer.trim() && !isTyping ? "#fff" : "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Zap size={15} color={answer.trim() && !isTyping ? "#000" : "rgba(255,255,255,0.3)"} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="interview-sidebar">
                <div style={{ ...panel, padding: 20 }}>
                  <p style={{ ...label, display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}><Activity size={12} /> Live Sensors</p>
                  <Meter label="Clarity" value={liveClarity} />
                  <Meter label="Confidence" value={liveConfidence} />
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center", fontFamily: "monospace", marginTop: 8 }}>Type to activate</p>
                </div>
                <div style={{ ...panel, padding: 20, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  {weaknesses.length > 0 && (
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
                      <Brain size={11} color="rgba(255,255,255,0.4)" />
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recall: {weaknesses[0]?.slice(0, 22)}…</span>
                    </div>
                  )}
                  <p style={{ ...label, display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}><Target size={12} /> Neural Profile</p>
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em", marginBottom: 8 }}>Weaknesses</p>
                    {weaknesses.length === 0 ? <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontStyle: "italic" }}>None yet</p>
                      : weaknesses.map((w, i) => <p key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>— {w}</p>)}
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em", marginBottom: 8, marginTop: 16 }}>Strengths</p>
                    {strengths.length === 0 ? <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontStyle: "italic" }}>None yet</p>
                      : strengths.map((s, i) => <p key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>+ {s}</p>)}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ DEBRIEF ══════════════════════════════════════════════════════ */}
          {stage === "debrief" && finalSummary && (
            <motion.div key="debrief" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ width: "100%", maxWidth: 820 }}>
              <div style={{ ...panel, padding: "40px 44px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                  <div>
                    <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Debrief</h2>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", margin: 0 }}>
                      Review each answer before seeing your final score
                    </p>
                  </div>
                  <button onClick={() => setStage("dashboard")}
                    style={{ padding: "10px 20px", borderRadius: 10, background: "#fff", color: "#000", border: "none", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                    Full Dashboard →
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {finalSummary.history.map((item, idx) => {
                    const s = item?.evaluation?.score ?? 0;
                    const col = s >= 7 ? "rgba(100,255,150,0.8)" : s >= 5 ? "rgba(255,200,80,0.8)" : "rgba(255,100,100,0.8)";
                    return (
                      <div key={idx} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
                        {/* Question header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            Q{idx + 1} · {item.difficulty || "Medium"}
                          </span>
                          <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 16, color: col }}>{s}/10</span>
                        </div>

                        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                          {/* Question text */}
                          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>
                            {item.question}
                          </p>

                          {/* Score bar */}
                          <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
                            <div style={{ width: `${s * 10}%`, height: "100%", background: col, borderRadius: 99, transition: "width .8s ease" }} />
                          </div>

                          {/* Your answer vs ideal */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>Your Answer</p>
                              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>{item.answer || "—"}</p>
                            </div>
                            {item?.evaluation?.ideal_answer && (
                              <div style={{ background: "rgba(100,255,150,0.04)", border: "1px solid rgba(100,255,150,0.12)", borderRadius: 10, padding: "12px 14px" }}>
                                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(100,255,150,0.5)", marginBottom: 6 }}>Ideal Answer</p>
                                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>{item.evaluation.ideal_answer}</p>
                              </div>
                            )}
                          </div>

                          {/* Tip */}
                          {item?.evaluation?.suggestions && (
                            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,200,80,0.7)", fontStyle: "italic", borderLeft: "2px solid rgba(255,200,80,0.2)", paddingLeft: 10 }}>
                              {item.evaluation.suggestions}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button onClick={() => window.location.reload()}
                    style={{ padding: "12px 22px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                    New Simulation
                  </button>
                  <button onClick={() => setStage("dashboard")}
                    style={{ padding: "12px 22px", borderRadius: 10, background: "#fff", color: "#000", border: "none", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                    View Full Dashboard →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ DASHBOARD ════════════════════════════════════════════════════ */}
          {stage === "dashboard" && finalSummary && (() => {
            const scores = finalSummary.history.map(h => h?.evaluation?.score ?? 0);
            const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—";
            return (
              <motion.div key="dashboard" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                style={{ width: "100%", maxWidth: 900, ...panel, padding: "48px 52px" }}>
                <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Simulation Report</h2>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", margin: "0 0 36px" }}>
                  {company} · {interviewType} · {role}
                </p>

                {/* Stats row */}
                <div className="dashboard-stats">
                  {[
                    ["Avg Score", `${avgScore}/10`],
                    ["Peak Difficulty", finalSummary.currentDifficulty],
                    ["Strengths", finalSummary.globalStrengths.length],
                    ["Questions", finalSummary.history.length],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 18px", textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{l}</p>
                      <p style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Per-question breakdown */}
                <div style={{ marginBottom: 28 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 14 }}>Question Breakdown</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {finalSummary.history.map((item, idx) => {
                      const s = item?.evaluation?.score ?? 0;
                      const barColor = s >= 7 ? "rgba(100,255,150,0.7)" : s >= 5 ? "rgba(255,200,80,0.7)" : "rgba(255,100,100,0.7)";
                      return (
                        <div key={idx} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              Q{idx + 1} · <span style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>{item.difficulty || "Medium"}</span> — {item.question}
                            </span>
                            <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 14, color: barColor, whiteSpace: "nowrap", marginLeft: 12 }}>{s}/10</span>
                          </div>
                          <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
                            <div style={{ width: `${s * 10}%`, height: "100%", background: barColor, borderRadius: 99, transition: "width .6s" }} />
                          </div>
                          {item?.evaluation?.suggestions && (
                            <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                              💡 {item.evaluation.suggestions}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                {(finalSummary.globalStrengths.length > 0 || finalSummary.globalWeaknesses.length > 0) && (
                  <div className="sw-grid" style={{ marginBottom: 28 }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(100,255,150,0.5)", marginBottom: 10 }}>Strengths</p>
                      {finalSummary.globalStrengths.length === 0
                        ? <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>None detected</p>
                        : finalSummary.globalStrengths.map((s, i) => <p key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: "0 0 4px" }}>+ {s}</p>)}
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,200,80,0.5)", marginBottom: 10 }}>Areas to Improve</p>
                      {finalSummary.globalWeaknesses.length === 0
                        ? <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>None detected</p>
                        : finalSummary.globalWeaknesses.map((w, i) => <p key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: "0 0 4px" }}>— {w}</p>)}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="dashboard-actions">
                  <button onClick={downloadReport} style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Download size={13} /> PDF Report
                  </button>
                  <button onClick={() => window.location.href = "/profile"} style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}>
                    View History →
                  </button>
                  <button onClick={() => window.location.reload()} style={{ padding: 14, borderRadius: 12, background: "#fff", color: "#000", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", border: "none", cursor: "pointer" }}>
                    New Simulation
                  </button>
                </div>
              </motion.div>
            );
          })()}

        </AnimatePresence>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .bounce-dot { animation: bounce 0.6s ease-in-out infinite alternate; }
        @keyframes bounce { from { transform: scaleY(0.5); } to { transform: scaleY(1.2); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cursor-blink { animation: blink 0.75s ease-in-out infinite; }
        @keyframes timerPulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,80,80,0)} 50%{box-shadow:0 0 0 4px rgba(255,80,80,0.35)} }
        .timer-urgent { animation: timerPulse 0.6s ease-in-out infinite; border-color: rgba(255,80,80,0.6) !important; color: rgba(255,120,120,1) !important; }

        .nav-txt-btn {
          font-size: 11px; color: rgba(255,255,255,0.45);
          font-family: monospace; letter-spacing: 0.05em;
          background: none; border: none; cursor: pointer;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .interview-grid {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 16px;
          height: 82vh;
        }

        .interview-sidebar {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 32px;
        }

        .sw-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .dashboard-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        /* ── Tablet ── */
        @media (max-width: 960px) {
          .interview-grid { grid-template-columns: 1fr; height: auto; min-height: 90vh; }
          .interview-sidebar { flex-direction: row; overflow-x: auto; padding-bottom: 4px; }
          .interview-sidebar > div { min-width: 180px; flex-shrink: 0; }
          .feature-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .nav-txt-btn { display: none; }
          .dashboard-stats { grid-template-columns: repeat(2, 1fr); }
          .sw-grid { grid-template-columns: 1fr; }
          .dashboard-actions { grid-template-columns: 1fr; }
          .company-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .feature-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 420px) {
          .company-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dashboard-stats { grid-template-columns: 1fr 1fr; }
        }

        select option { background: #111; }
        textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.2); }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
