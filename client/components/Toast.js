"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { subscribeToast } from "@/lib/toast";

const ICONS = {
  success: <CheckCircle2 size={14} />,
  error:   <AlertCircle  size={14} />,
  info:    <Info         size={14} />,
};

const BG = {
  success: "rgba(15,120,50,0.96)",
  error:   "rgba(160,30,30,0.96)",
  info:    "rgba(20,20,35,0.96)",
};

const BORDER = {
  success: "rgba(80,220,120,0.25)",
  error:   "rgba(255,100,100,0.25)",
  info:    "rgba(255,255,255,0.1)",
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeToast(t => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.duration);
    });
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(x => x.id !== id));

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end",
      pointerEvents: "none",
    }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 50, scale: 0.92 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{    opacity: 0, x: 50, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            style={{
              background: BG[t.type],
              border: `1px solid ${BORDER[t.type]}`,
              borderRadius: 12, padding: "12px 14px",
              display: "flex", alignItems: "flex-start", gap: 10,
              maxWidth: 320, fontSize: 13, color: "#fff",
              backdropFilter: "blur(24px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
              pointerEvents: "all",
            }}>
            <span style={{ marginTop: 1, opacity: 0.85, flexShrink: 0 }}>{ICONS[t.type]}</span>
            <span style={{ flex: 1, lineHeight: 1.45 }}>{t.msg}</span>
            <button onClick={() => dismiss(t.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: 0, flexShrink: 0, marginTop: 1 }}>
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
