"use client";

import { motion } from "framer-motion";
import { Mic, Video, Sparkles, Users } from "lucide-react";
import { getCompany } from "@/lib/companies";

const PREVIEW_LINES = {
  Technical: "Thanks for joining us today. I'd like to start with something practical from your recent work…",
  "HR & Culture": "Great to meet you. Tell me about a time you had to navigate a difficult team situation.",
  "System Design": "Let's walk through a design problem — imagine you're launching a new service at scale.",
  "Coding Round": "I'll share a coding problem. Talk me through your approach as you work through it.",
};

const PERSONA_META = {
  "Harsh Tech Lead": { vibe: "Direct · No fluff", avatar: "HT" },
  "Friendly Microsoft HR": { vibe: "Warm · STAR format", avatar: "HR" },
  "Chaotic Startup Founder": { vibe: "Fast · Unpredictable", avatar: "CF" },
};

export default function InterviewHero({ company, persona, interviewType, role, candidateName }) {
  const co = getCompany(company);
  const meta = PERSONA_META[persona] || { vibe: "Professional", avatar: "AI" };
  const preview = PREVIEW_LINES[interviewType] || PREVIEW_LINES.Technical;

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", marginBottom: 28 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade8088" }} />
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
          Live mock interview room
        </span>
      </div>

      <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
        Practice interviews that<br />
        <span style={{ color: "rgba(255,255,255,0.35)" }}>feel human.</span>
      </h1>

      <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.42)", maxWidth: 480, margin: "0 0 32px" }}>
        Real conversation — not robotic flashcards. Adaptive follow-ups, voice answers,
        and honest feedback after every response. Like a Zoom call with a senior interviewer.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 36 }}>
        {[
          { icon: Video, text: "Video-call vibe" },
          { icon: Mic, text: "Voice or type" },
          { icon: Sparkles, text: "Resume-tailored" },
          { icon: Users, text: "Company-specific" },
        ].map(({ icon: Icon, text }) => (
          <span key={text} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.38)", padding: "7px 12px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
            <Icon size={12} /> {text}
          </span>
        ))}
      </div>

      {/* Video-call preview card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          overflow: "hidden",
          maxWidth: 520,
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: co.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff" }}>
              {meta.avatar}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{persona}</p>
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {co.name} · {interviewType}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", opacity: 0.8 }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24", opacity: 0.8 }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", opacity: 0.8 }} />
          </div>
        </div>

        <div style={{ padding: "20px 18px 18px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: "0 0 12px" }}>
            {role ? `Interviewing for ${role}` : "Select a role to preview"}
          </p>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "4px 16px 16px 16px", padding: "14px 16px", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.82)" }}>
              {candidateName ? `Hi ${candidateName}, ` : ""}{preview}
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px 4px 16px 16px", padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
              Your answer appears here…
            </div>
          </div>
          <p style={{ margin: "14px 0 0", fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}>
            {meta.vibe} · Questions adapt to your answers
          </p>
        </div>
      </motion.div>
    </div>
  );
}
