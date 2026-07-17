"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  ArrowLeft, BrainCircuit, Target, TrendingUp, BookOpen,
  FolderGit2, Sparkles, Loader2, AlertCircle, Activity, Download,
  Brain, Zap, ChevronRight, ListChecks,
} from "lucide-react";

import { getApiBase } from "@/lib/api";
import { loadGeminiKey } from "@/lib/brand";
import { toast } from "@/lib/toast";

const panel = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20,
  backdropFilter: "blur(20px)",
};

const label = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.28)",
};

export default function MentorPage() {
  const { userId, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [activeTab, setActiveTab] = useState("roadmap"); // "roadmap" | "coach"
  const [coachData, setCoachData] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${getApiBase()}/mentor/${userId}`);
      setStats(res.data.stats);
      setRoadmap(res.data.roadmap);
      setHasData(res.data.hasData);
      if (res.data.stats?.roles?.[0]) setTargetRole(res.data.stats.roles[0]);
    } catch (e) {
      setError("Could not load mentor profile.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !userId) return;
    fetchProfile();
  }, [userId, isLoaded]);

  const downloadRoadmap = async () => {
    if (!roadmap) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("NEXUS.AI — Career Roadmap", W / 2, y, { align: "center" }); y += 10;
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(120);
    doc.text(`Target: ${roadmap.targetRole || "—"} · Generated ${new Date().toLocaleDateString()}`, W / 2, y, { align: "center" }); y += 16;

    // Weakness analysis
    if (roadmap.weakness_analysis) {
      doc.setTextColor(0); doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.text("Weakness Analysis", 14, y); y += 8;
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(40);
      const sumLines = doc.splitTextToSize(roadmap.weakness_analysis.summary || "", W - 28);
      doc.text(sumLines, 14, y); y += sumLines.length * 5 + 6;
      (roadmap.weakness_analysis.priority_areas || []).forEach(a => {
        doc.text(`• ${a}`, 18, y); y += 5;
      });
      y += 4;
    }

    // Learning roadmap
    if ((roadmap.learning_roadmap || []).length) {
      doc.setDrawColor(220); doc.line(14, y, W - 14, y); y += 8;
      doc.setTextColor(0); doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.text("4-Week Learning Roadmap", 14, y); y += 8;
      (roadmap.learning_roadmap || []).forEach(w => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text(`Week ${w.week}: ${w.focus}`, 14, y); y += 6;
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(60);
        (w.topics || []).forEach(t => { doc.text(`  Topic: ${t}`, 16, y); y += 4; });
        (w.resources || []).forEach(r => { doc.text(`  Resource: ${r}`, 16, y); y += 4; });
        (w.goals || []).forEach(g => { doc.text(`  ✓ ${g}`, 16, y); y += 4; });
        y += 4;
      });
    }

    // Recommended projects
    if ((roadmap.recommended_projects || []).length) {
      doc.setDrawColor(220); doc.line(14, y, W - 14, y); y += 8;
      doc.setTextColor(0); doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.text("Recommended Projects", 14, y); y += 8;
      (roadmap.recommended_projects || []).forEach(p => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text(`${p.title} [${p.difficulty}] ~${p.estimated_weeks}w`, 14, y); y += 6;
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(60);
        const dLines = doc.splitTextToSize(p.description || "", W - 28);
        doc.text(dLines, 14, y); y += dLines.length * 4 + 4;
      });
    }

    doc.save(`nexus-roadmap-${Date.now()}.pdf`);
  };

  const generatePlan = async () => {
    const userApiKey = loadGeminiKey();
    if (!userApiKey) {
      setError("Add your Gemini API key on the home page first (Connect Your AI screen).");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const res = await axios.post(
        `${getApiBase()}/mentor/generate`,
        { clerkId: userId, userApiKey, targetRole: targetRole || undefined },
        { timeout: 90000 }
      );
      setStats(res.data.stats);
      setRoadmap(res.data.roadmap);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to generate roadmap.");
    } finally {
      setGenerating(false);
    }
  };

  const runCoach = async () => {
    const userApiKey = loadGeminiKey();
    if (!userApiKey) { toast.error("Add your Gemini API key on the home page first."); return; }
    setCoachLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${getApiBase()}/coach/analyze/${userId}`,
        { userApiKey, targetRole: targetRole || undefined },
        { timeout: 60000 }
      );
      setCoachData(res.data);
    } catch (e) {
      const msg = e.response?.data?.error || "Failed to run coach analysis.";
      setError(msg);
      toast.error(msg);
    } finally {
      setCoachLoading(false);
    }
  };

  const startDrill = (weakness) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("nexus_drill_context", JSON.stringify({ weakness }));
    window.location.href = "/";
  };

  if (!isLoaded || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "#fff", fontFamily: "Inter, sans-serif" }}>
        <Activity size={28} style={{ opacity: 0.4 }} />
        <span style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Loading Nexus Mentor...</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <p>Sign in required. <a href="/" style={{ color: "rgba(255,255,255,0.5)" }}>Go home</a></p>
      </div>
    );
  }

  const analysis = roadmap?.weakness_analysis;
  const weeks = roadmap?.learning_roadmap || [];
  const projects = roadmap?.recommended_projects || [];

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "Inter, sans-serif", paddingBottom: 60 }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(5,5,5,0.8)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => (window.location.href = "/")} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", cursor: "pointer" }}>
          <ArrowLeft size={13} /> NEXUS.AI
        </button>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button onClick={() => (window.location.href = "/profile")} style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "monospace", background: "none", border: "none", cursor: "pointer" }}>History →</button>
          <UserButton />
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px 0" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <BrainCircuit size={24} color="rgba(255,255,255,0.5)" />
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Nexus Mentor</h1>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>V4</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "0 0 24px" }}>Weakness analysis · Learning roadmap · Recommended projects</p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 4, width: "fit-content" }}>
            {[
              { id: "roadmap", icon: <BookOpen size={13} />, label: "Roadmap" },
              { id: "coach",   icon: <Brain    size={13} />, label: "AI Coach" },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", transition: "all .2s",
                  background: activeTab === t.id ? "#fff" : "none",
                  color: activeTab === t.id ? "#000" : "rgba(255,255,255,0.4)" }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ ...panel, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 10, alignItems: "center", borderColor: "rgba(255,80,80,0.3)" }}>
            <AlertCircle size={16} color="rgba(255,120,120,0.9)" />
            <span style={{ fontSize: 13, color: "rgba(255,180,180,0.9)" }}>{error}</span>
          </div>
        )}

        {/* ══ COACH TAB ══════════════════════════════════════════════════════ */}
        {activeTab === "coach" && (
          <div>
            {/* Analyze button */}
            <div style={{ ...panel, padding: "24px 28px", marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>Agentic Performance Analysis</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
                  AI observes your full history, identifies your biggest gap, and builds a targeted drill.
                </p>
              </div>
              <button onClick={runCoach} disabled={!hasData || coachLoading}
                style={{ padding: "12px 24px", borderRadius: 11, border: "none", cursor: !hasData || coachLoading ? "not-allowed" : "pointer", background: !hasData || coachLoading ? "rgba(255,255,255,0.1)" : "#fff", color: !hasData || coachLoading ? "rgba(255,255,255,0.35)" : "#000", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
                {coachLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Brain size={14} />}
                {coachLoading ? "Analyzing..." : coachData ? "Re-analyze" : "Analyze Me"}
              </button>
            </div>

            {!hasData && (
              <div style={{ ...panel, padding: 48, textAlign: "center" }}>
                <Brain size={36} style={{ color: "rgba(255,255,255,0.15)", margin: "0 auto 16px" }} />
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>Complete at least one interview to unlock coach analysis.</p>
                <button onClick={() => window.location.href = "/"} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, background: "#fff", color: "#000", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Start Interview</button>
              </div>
            )}

            {coachData && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Insight */}
                <div style={{ ...panel, padding: "22px 24px", borderColor: "rgba(129,140,248,0.2)" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(129,140,248,0.6)", margin: "0 0 8px" }}>Coach Insight</p>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.85)", margin: "0 0 10px" }}>{coachData.coaching.insight}</p>
                  {coachData.coaching.encouragement && (
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontStyle: "italic", margin: 0 }}>{coachData.coaching.encouragement}</p>
                  )}
                </div>

                {/* Priority weakness + drill */}
                <div style={{ ...panel, padding: "22px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,200,80,0.6)", margin: "0 0 6px" }}>Priority Weakness</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>{coachData.coaching.priority_weakness}</p>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", margin: "0 0 6px" }}>Drill Question</p>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 0 8px" }}>{coachData.coaching.drill_question}</p>
                      {coachData.coaching.drill_tip && (
                        <p style={{ fontSize: 11, color: "rgba(255,200,80,0.6)", fontStyle: "italic", borderLeft: "2px solid rgba(255,200,80,0.2)", paddingLeft: 10, margin: 0 }}>
                          Tip: {coachData.coaching.drill_tip}
                        </p>
                      )}
                    </div>
                    <button onClick={() => startDrill(coachData.coaching.priority_weakness)}
                      style={{ padding: "12px 20px", borderRadius: 11, background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)", color: "rgba(129,140,248,0.9)", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <Zap size={13} /> Drill it now →
                    </button>
                  </div>
                </div>

                {/* Next steps */}
                {(coachData.coaching.next_steps || []).length > 0 && (
                  <div style={{ ...panel, padding: "22px 24px" }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
                      <ListChecks size={11} /> This week's actions
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {coachData.coaching.next_steps.map((step, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <span style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>{i + 1}</span>
                          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, margin: 0 }}>{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats summary */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    ["Sessions", coachData.stats.sessionCount],
                    ["Avg Score", coachData.stats.avgScore ? `${coachData.stats.avgScore}/10` : "—"],
                    ["Tracked Gaps", coachData.stats.topWeaknesses?.length || 0],
                  ].map(([l, v]) => (
                    <div key={l} style={{ ...panel, padding: "16px 18px", textAlign: "center" }}>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>{l}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{v}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ══ ROADMAP TAB ════════════════════════════════════════════════════ */}
        {activeTab === "roadmap" && <>

        {/* Stats row */}
        {stats && (
          <div className="mentor-stats-grid" style={{ gap: 16, marginBottom: 32 }}>
            {[
              { icon: <Target size={18} />, label: "Sessions", value: stats.sessionCount },
              { icon: <TrendingUp size={18} />, label: "Avg Score", value: stats.avgScore ? `${stats.avgScore}/10` : "—" },
              { icon: <Sparkles size={18} />, label: "Weaknesses Tracked", value: stats.topWeaknesses?.length || 0 },
            ].map(({ icon, label: lbl, value }) => (
              <div key={lbl} style={{ ...panel, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.55)" }}>{icon}</div>
                <div>
                  <p style={{ ...label, marginBottom: 4 }}>{lbl}</p>
                  <p style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generate CTA */}
        <div style={{ ...panel, padding: "24px 28px", marginBottom: 32, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ ...label, marginBottom: 8 }}>Target Role</p>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#fff", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={generatePlan}
              disabled={!hasData || generating}
              style={{ padding: "12px 24px", borderRadius: 11, border: "none", cursor: !hasData || generating ? "not-allowed" : "pointer", background: !hasData || generating ? "rgba(255,255,255,0.1)" : "#fff", color: !hasData || generating ? "rgba(255,255,255,0.35)" : "#000", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}
            >
              {generating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
              {generating ? "Analyzing..." : roadmap ? "Regenerate Plan" : "Generate Roadmap"}
            </button>
            {roadmap && (
              <button
                onClick={downloadRoadmap}
                style={{ padding: "12px 20px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}
              >
                <Download size={14} />
                Export PDF
              </button>
            )}
          </div>
        </div>

        {!hasData && (
          <div style={{ ...panel, padding: 48, textAlign: "center" }}>
            <BookOpen size={36} style={{ color: "rgba(255,255,255,0.15)", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>Complete at least one NEXUS.AI interview to unlock your personalized roadmap.</p>
            <button onClick={() => (window.location.href = "/")} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, background: "#fff", color: "#000", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Start Simulation</button>
          </div>
        )}

        {hasData && !roadmap && !generating && (
          <div style={{ ...panel, padding: 32, textAlign: "center", marginBottom: 32 }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>You have interview data. Click <strong>Generate Roadmap</strong> to get your AI plan.</p>
          </div>
        )}

        {/* Weakness Analysis */}
        {analysis && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
            <h2 style={{ ...label, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Target size={12} /> Weakness Analysis</h2>
            <div style={{ ...panel, padding: "28px" }}>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.75)", margin: "0 0 24px" }}>{analysis.summary}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 20 }}>
                {(analysis.patterns || []).map((p, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{p.theme}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)" }}>{p.frequency}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>{p.impact}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0, fontStyle: "italic" }}>Root: {p.root_cause}</p>
                  </div>
                ))}
              </div>
              <p style={{ ...label, marginBottom: 8 }}>Priority Areas</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(analysis.priority_areas || []).map((a, i) => (
                  <span key={i} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 99, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>{a}</span>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Learning Roadmap */}
        {weeks.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 32 }}>
            <h2 style={{ ...label, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><BookOpen size={12} /> Learning Roadmap</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {weeks.map((w) => (
                <div key={w.week} style={{ ...panel, padding: "22px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13 }}>W{w.week}</span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{w.focus}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 12 }}>
                    <div>
                      <p style={{ ...label, marginBottom: 6 }}>Topics</p>
                      {(w.topics || []).map((t, i) => <p key={i} style={{ margin: "0 0 3px", color: "rgba(255,255,255,0.55)" }}>· {t}</p>)}
                    </div>
                    <div>
                      <p style={{ ...label, marginBottom: 6 }}>Resources</p>
                      {(w.resources || []).map((r, i) => <p key={i} style={{ margin: "0 0 3px", color: "rgba(255,255,255,0.55)" }}>· {r}</p>)}
                    </div>
                    <div>
                      <p style={{ ...label, marginBottom: 6 }}>Goals</p>
                      {(w.goals || []).map((g, i) => <p key={i} style={{ margin: "0 0 3px", color: "rgba(255,255,255,0.55)" }}>✓ {g}</p>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Recommended Projects */}
        {projects.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 style={{ ...label, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><FolderGit2 size={12} /> Recommended Projects</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {projects.map((p, i) => (
                <div key={i} style={{ ...panel, padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, maxWidth: "75%" }}>{p.title}</h3>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "3px 8px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)" }}>{p.difficulty}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: "0 0 14px" }}>{p.description}</p>
                  <p style={{ ...label, marginBottom: 6 }}>Skills Addressed</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {(p.skills_addressed || []).map((s, j) => (
                      <span key={j} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 99, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>{s}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", margin: 0 }}>~{p.estimated_weeks} weeks</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Raw weakness frequency */}
        {stats?.topWeaknesses?.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h2 style={{ ...label, marginBottom: 16 }}>Detected Weaknesses (from interviews)</h2>
            <div style={{ ...panel, padding: "20px 24px" }}>
              {stats.topWeaknesses.map((w, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < stats.topWeaknesses.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{w.text}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>{w.count}×</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </> /* end roadmap tab */}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .mentor-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 700px) {
          .mentor-stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      </div>
    </div>
  );
}
