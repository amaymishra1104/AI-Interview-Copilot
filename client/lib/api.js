const RENDER_API = "https://ai-interview-platform-1-h5tt.onrender.com";

export function getApiBase() {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (env) return env;

  if (typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app")) {
    return RENDER_API;
  }

  return "http://localhost:5000";
}
