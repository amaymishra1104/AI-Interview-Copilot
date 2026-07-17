"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const STEPS = [
  {
    emoji: "🧠",
    title: "Welcome to NEXUS.AI",
    body: "The most realistic AI interview simulator. Real questions, real-time evaluation, and honest feedback — so your actual interview feels easy.",
  },
  {
    emoji: "🔑",
    title: "You need one free API key",
    body: "NEXUS.AI runs on Google Gemini. Your key is free (1,500 requests/day), takes 30 seconds to get, and never touches our servers.",
    cta: { label: "Get your free Gemini key →", href: "https://aistudio.google.com/app/apikey" },
  },
  {
    emoji: "🎯",
    title: "Pick a role. Start firing.",
    body: "Choose a company, interview type, and persona. The AI adapts difficulty in real-time based on every answer you give.",
  },
];

export default function OnboardingModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("nexus_onboarded")) {
      // Small delay so the page renders first
      setTimeout(() => setShow(true), 600);
    }
  }, []);

  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem("nexus_onboarded", "1");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) dismiss(); }}>

          <motion.div
            initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            style={{
              background: "#080808", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24, padding: "44px 44px 36px", maxWidth: 440, width: "100%",
              position: "relative", fontFamily: "Inter, sans-serif",
            }}>

            {/* Close */}
            <button onClick={dismiss} style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 4 }}>
              <X size={16} />
            </button>

            {/* Progress bars */}
            <div style={{ display: "flex", gap: 6, marginBottom: 36 }}>
              {STEPS.map((_, i) => (
                <motion.div key={i}
                  animate={{ background: i <= step ? "#fff" : "rgba(255,255,255,0.12)" }}
                  transition={{ duration: 0.3 }}
                  style={{ height: 2, flex: 1, borderRadius: 99 }} />
              ))}
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.22 }}>
                <div style={{ fontSize: 44, marginBottom: 20, lineHeight: 1 }}>{STEPS[step].emoji}</div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
                  {STEPS[step].title}
                </h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0 }}>
                  {STEPS[step].body}
                </p>
                {STEPS[step].cta && (
                  <a href={STEPS[step].cta.href} target="_blank" rel="noreferrer"
                    style={{ display: "inline-block", marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.65)", textDecoration: "underline" }}>
                    {STEPS[step].cta.label}
                  </a>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40 }}>
              <button onClick={dismiss}
                style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em" }}>
                Skip
              </button>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {step > 0 && (
                  <button onClick={() => setStep(p => p - 1)}
                    style={{ padding: "10px 18px", borderRadius: 10, background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    ← Back
                  </button>
                )}
                <button
                  onClick={() => step < STEPS.length - 1 ? setStep(p => p + 1) : dismiss()}
                  style={{ padding: "10px 22px", borderRadius: 10, background: "#fff", color: "#000", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  {step < STEPS.length - 1 ? "Next →" : "Let's go →"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
