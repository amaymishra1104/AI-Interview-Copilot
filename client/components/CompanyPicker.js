"use client";

import { useState, useRef, useEffect } from "react";
import { FEATURED, searchCompanies, getCompany } from "@/lib/companies";
import { Search, X } from "lucide-react";

const labelStyle = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
  marginBottom: 10, display: "block",
};

export default function CompanyPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const dropRef = useRef(null);
  const selected = getCompany(value);
  const isFeatured = FEATURED.some(c => c.id === value);
  const results = searchCompanies(query);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!dropRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (co) => {
    onChange(co.id);
    setQuery("");
    setOpen(false);
  };

  const clearCustom = () => {
    onChange("Agnostic");
    setQuery("");
  };

  return (
    <div>
      <span style={labelStyle}>Target Company</span>

      {/* Featured quick-pick grid */}
      <div className="company-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
        {FEATURED.map((co) => {
          const sel = value === co.id;
          return (
            <button key={co.id} type="button" onClick={() => { onChange(co.id); setQuery(""); }}
              title={co.tagline}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "12px 6px", borderRadius: 12, cursor: "pointer", transition: "all .2s",
                border: sel ? `1.5px solid ${co.color}` : "1px solid rgba(255,255,255,0.08)",
                background: sel ? `${co.color}18` : "rgba(255,255,255,0.02)",
                boxShadow: sel ? `0 0 18px ${co.color}33` : "none",
              }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, fontWeight: 800,
                fontSize: co.initials.length > 1 ? 9 : 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: sel ? co.color : "rgba(255,255,255,0.06)",
                color: sel ? "#fff" : "rgba(255,255,255,0.55)",
              }}>{co.initials}</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: sel ? "#fff" : "rgba(255,255,255,0.4)" }}>
                {co.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search input */}
      <div style={{ position: "relative" }} ref={dropRef}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "9px 12px",
        }}>
          <Search size={13} color="rgba(255,255,255,0.3)" />
          <input ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={isFeatured ? "Search any company (Flipkart, Zepto, Citadel…)" : `Using: ${selected.name}`}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "#fff", fontSize: 12,
            }}
          />
          {!isFeatured && (
            <button onClick={clearCustom} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0, display: "flex" }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && query && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100,
            background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
            overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          }}>
            {results.length === 0 ? (
              <div style={{ padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                No match — using "{query}" as custom company
                <button onClick={() => { onChange(query); setQuery(""); setOpen(false); }}
                  style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
                  Use it →
                </button>
              </div>
            ) : (
              results.map(co => (
                <button key={co.id} onClick={() => pick(co)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", background: value === co.id ? "rgba(255,255,255,0.06)" : "none",
                    border: "none", cursor: "pointer", textAlign: "left",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = value === co.id ? "rgba(255,255,255,0.06)" : "none"}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, background: `${co.color}22`,
                    border: `1px solid ${co.color}44`, color: co.color,
                    fontSize: co.initials.length > 1 ? 8 : 11, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{co.initials}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#fff" }}>{co.name}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{co.tagline}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
