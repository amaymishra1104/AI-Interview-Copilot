"use client"

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Rocket, Target, ArrowLeft, BarChart3, BrainCircuit, Activity, Database, ChevronDown, ChevronUp, MessageSquare, TrendingUp, Trash2 } from "lucide-react";
import { getApiBase } from "@/lib/api";
import { toast } from "@/lib/toast";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

const panel = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, backdropFilter: "blur(20px)" };

function ScoreChip({ score }) {
  const color = score >= 7 ? "rgba(100,255,150,0.85)" : score >= 5 ? "rgba(255,200,80,0.85)" : "rgba(255,100,100,0.8)";
  return (
    <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 13, color, minWidth: 32, display: "inline-block" }}>
      {score}/10
    </span>
  );
}

function ChatTranscript({ session }) {
  return (
    <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 20 }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>
        Full Conversation
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(session.history || []).map((entry, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Question number */}
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", margin: 0 }}>
              Q{i + 1} · {entry.difficulty || "Medium"}
            </p>

            {/* AI question bubble */}
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ maxWidth: "85%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px 16px 16px 16px", padding: "12px 16px", fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>
                {entry.question}
              </div>
            </div>

            {/* User answer bubble */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ maxWidth: "85%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px 4px 16px 16px", padding: "12px 16px", fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.75)" }}>
                {entry.answer}
              </div>
            </div>

            {/* Evaluation row */}
            {entry.evaluation && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px", fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Evaluation</span>
                  <ScoreChip score={entry.evaluation.score} />
                </div>
                {/* Score bar */}
                <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 99, marginBottom: 10 }}>
                  <div style={{ width: `${entry.evaluation.score * 10}%`, height: "100%", background: entry.evaluation.score >= 7 ? "rgba(100,255,150,0.7)" : entry.evaluation.score >= 5 ? "rgba(255,200,80,0.7)" : "rgba(255,100,100,0.7)", borderRadius: 99 }} />
                </div>
                {entry.evaluation.suggestions && (
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, fontStyle: "italic" }}>
                    💡 {entry.evaluation.suggestions}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionCard({ session, index, onDelete }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const sessionScores = (session.history || []).map(h => h?.evaluation?.score ?? 0);
  const sessionAvg = sessionScores.length ? (sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length).toFixed(1) : "—";

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm("Delete this session? This can't be undone.")) return;
    setDeleting(true);
    try {
      await axios.delete(`${getApiBase()}/interview/session/${session.sessionId}`);
      onDelete(session.sessionId);
      toast.success("Session deleted.");
    } catch {
      toast.error("Failed to delete. Try again.");
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.06 }}
      style={{ ...panel, padding: "22px 24px", position: "relative", opacity: deleting ? 0.5 : 1 }}
    >
      {/* Difficulty badge + delete */}
      <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {session.currentDifficulty || "—"}
        </span>
        <button onClick={handleDelete} disabled={deleting} title="Delete session"
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: 2, display: "flex", alignItems: "center" }}
          onMouseEnter={e => e.currentTarget.style.color = "rgba(255,100,100,0.7)"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>
          <Trash2 size={13} />
        </button>
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px", maxWidth: "78%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.role}</h4>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", margin: "0 0 16px" }}>
        {session.createdAt ? new Date(session.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"} · {(session.history || []).length} questions
      </p>

      {/* Strengths / Weaknesses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.22)", marginBottom: 6 }}>Weaknesses</p>
          {(session.globalWeaknesses || []).length === 0
            ? <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontStyle: "italic" }}>None</p>
            : (session.globalWeaknesses || []).slice(0, 2).map((w, idx) => (
              <p key={idx} style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>— {w}</p>
            ))}
        </div>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.22)", marginBottom: 6 }}>Strengths</p>
          {(session.globalStrengths || []).length === 0
            ? <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontStyle: "italic" }}>None</p>
            : (session.globalStrengths || []).slice(0, 2).map((s, idx) => (
              <p key={idx} style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>+ {s}</p>
            ))}
        </div>
      </div>

      {/* Score dots + avg */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(session.history || []).map((h, idx) => (
            <div key={idx} style={{ width: 10, height: 10, borderRadius: "50%", background: (h?.evaluation?.score ?? 0) >= 7 ? "rgba(100,255,150,0.7)" : (h?.evaluation?.score ?? 0) >= 5 ? "rgba(255,200,80,0.7)" : "rgba(255,100,100,0.6)" }} />
          ))}
        </div>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          avg {sessionAvg}/10
        </span>
      </div>

      {/* Toggle transcript */}
      {(session.history || []).length > 0 && (
        <button
          onClick={() => setOpen(!open)}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 12px", cursor: "pointer", width: "100%", justifyContent: "center" }}
        >
          <MessageSquare size={12} />
          {open ? "Hide" : "View"} Chat Transcript
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}

      {/* Transcript */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <ChatTranscript session={session} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Profile() {
  const { userId, isLoaded } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    axios.get(`${getApiBase()}/interview/user/${userId}`)
      .then(res => setSessions(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [userId, isLoaded]);

  const handleDelete = (sessionId) => {
    setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
  };

  if (!isLoaded || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "#fff", fontFamily: "Inter, sans-serif" }}>
        <Activity size={28} style={{ opacity: 0.4, animation: "pulse 1.5s ease-in-out infinite" }} />
        <span style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Fetching Neural Records...</span>
        <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }`}</style>
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Inter, sans-serif" }}>
        <p>Unauthorized. <a href="/" style={{ color: "rgba(255,255,255,0.5)" }}>Go back</a></p>
      </div>
    );
  }

  const totalInterviews = sessions.length;
  const allScores = sessions.flatMap(s => (s.history || []).map(h => h?.evaluation?.score ?? 0));
  const avgScore = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : "—";
  let highestDiff = "Easy";
  if (sessions.some(s => s.currentDifficulty === "Hard")) highestDiff = "Hard";
  else if (sessions.some(s => s.currentDifficulty === "Medium")) highestDiff = "Medium";

  const scoreChartData = [...sessions].reverse().map((s, i) => ({
    session: `S${i + 1}`,
    score: s.history?.length
      ? Number((s.history.reduce((a, h) => a + (h?.evaluation?.score || 0), 0) / s.history.length).toFixed(1))
      : 0,
  }));

  const weaknessMap = {};
  sessions.forEach(s => (s.globalWeaknesses || []).forEach(w => { weaknessMap[w] = (weaknessMap[w] || 0) + 1; }));
  const weaknessChartData = Object.entries(weaknessMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([text, count]) => ({ text: text.length > 22 ? text.slice(0, 22) + "…" : text, count }));

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "Inter, sans-serif", padding: "0 0 60px" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(5,5,5,0.8)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => window.location.href = "/"} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          <ArrowLeft size={13} /> Back to NEXUS.AI
        </button>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button onClick={() => window.location.href = "/mentor"} style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "monospace", background: "none", border: "none", cursor: "pointer" }}>Mentor →</button>
          <UserButton />
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px 0" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Database size={22} color="rgba(255,255,255,0.5)" />
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>Interview History</h1>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}>
            All sessions saved · click any card to read the full chat
          </p>
        </div>

        {/* Stats */}
        <div className="profile-stats-grid" style={{ gap: 16, marginBottom: 40 }}>
          {[
            { icon: <Target size={20} />, label: "Total Simulations", value: totalInterviews },
            { icon: <BarChart3 size={20} />, label: "Avg Score", value: avgScore },
            { icon: <BrainCircuit size={20} />, label: "Peak Difficulty", value: highestDiff },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ ...panel, padding: "24px 28px", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)" }}>{icon}</div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.28)", marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        {sessions.length > 1 && (
          <div className="profile-chart-grid" style={{ gap: 16, marginBottom: 40 }}>
            {/* Score Trend */}
            <div style={{ ...panel, padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <TrendingUp size={14} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.28)" }}>Score Trend</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={scoreChartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="session" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "rgba(255,255,255,0.5)" }} itemStyle={{ color: "#fff" }} />
                  <Line type="monotone" dataKey="score" stroke="rgba(255,255,255,0.7)" strokeWidth={2} dot={{ fill: "#fff", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Weakness Frequency */}
            <div style={{ ...panel, padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <BarChart3 size={14} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.28)" }}>Top Weaknesses</span>
              </div>
              {weaknessChartData.length === 0
                ? <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic", textAlign: "center", paddingTop: 40 }}>No weaknesses recorded yet</p>
                : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weaknessChartData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="text" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} itemStyle={{ color: "#fff" }} />
                      <Bar dataKey="count" fill="rgba(255,255,255,0.15)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>
          </div>
        )}

        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 12, marginBottom: 24 }}>
          Simulation History
        </h3>

        {sessions.length === 0 ? (
          <div style={{ ...panel, padding: 64, textAlign: "center" }}>
            <Rocket size={36} style={{ color: "rgba(255,255,255,0.15)", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>No simulations yet. Complete an interview to see your history here.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {sessions.map((session, i) => (
              <SessionCard key={session.sessionId || i} session={session} index={i} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
      <style>{`
        .profile-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
        .profile-chart-grid { display: grid; grid-template-columns: 1fr 1fr; }
        @media (max-width: 700px) {
          .profile-stats-grid { grid-template-columns: 1fr; }
          .profile-chart-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
