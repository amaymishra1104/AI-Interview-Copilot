export const APP_NAME = "NEXUS.AI";

const GEMINI_KEY = "nexus_gemini_key";
const LEGACY_GEMINI_KEY = "careerforge_gemini_key";

export function loadGeminiKey() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(GEMINI_KEY) || sessionStorage.getItem(LEGACY_GEMINI_KEY);
}

export function saveGeminiKey(key) {
  sessionStorage.setItem(GEMINI_KEY, key.trim());
  sessionStorage.removeItem(LEGACY_GEMINI_KEY);
}
