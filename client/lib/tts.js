// ElevenLabs TTS + browser speechSynthesis fallback
// Supports English, Hindi, and Hinglish

const VOICE_IDS = {
  "Harsh Tech Lead":        "TxGEqnHWrfWFTfGW9XjX", // Josh — deep professional male
  "Friendly Microsoft HR":  "21m00Tcm4TlvDq8ikWAM", // Rachel — warm female
  "Chaotic Startup Founder":"AZnzlk1XvdvUeBnXmlld", // Domi — energetic
};

export function getVoiceId(persona) {
  return VOICE_IDS[persona] || VOICE_IDS["Harsh Tech Lead"];
}

export const EL_KEY = "nexus_elevenlabs_key";
export function loadElevenLabsKey() { return typeof window !== "undefined" ? sessionStorage.getItem(EL_KEY) || "" : ""; }
export function saveElevenLabsKey(k) { sessionStorage.setItem(EL_KEY, k); }

let currentAudio = null;

export function cancelSpeech() {
  if (currentAudio) { try { currentAudio.pause(); } catch {} currentAudio = null; }
  if (typeof window !== "undefined") try { window.speechSynthesis?.cancel(); } catch {}
}

// Returns a Hindi/Indian voice if available, else null
async function getHindiVoice() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return null;

  let voices = synth.getVoices();

  // getVoices() is async on some browsers — wait for the event if list is empty
  if (!voices.length) {
    await new Promise(res => {
      const onchange = () => { res(); synth.onvoiceschanged = null; };
      synth.onvoiceschanged = onchange;
      // Fallback timeout in case event never fires
      setTimeout(res, 1200);
    });
    voices = synth.getVoices();
  }

  return (
    voices.find(v => v.lang === "hi-IN" && v.localService) ||   // prefer local (faster)
    voices.find(v => v.lang === "hi-IN") ||                     // any hi-IN
    voices.find(v => v.lang.startsWith("hi")) ||                // hi-* fallback
    voices.find(v => v.lang === "en-IN") ||                     // Indian English as last resort
    null
  );
}

export async function speak(text, persona, elevenLabsKey, { onStart, onEnd } = {}, language = "English") {
  cancelSpeech();
  onStart?.();

  const isHindi = language === "Hindi" || language === "Hinglish";

  // ── ElevenLabs path ──────────────────────────────────────────────────────────
  if (elevenLabsKey?.trim().length > 10) {
    try {
      const voiceId = getVoiceId(persona);
      const body = {
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.50, similarity_boost: 0.75 },
      };
      // Tell ElevenLabs to synthesise in Hindi — critical for natural pronunciation
      if (isHindi) body.language_code = "hi";

      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "xi-api-key": elevenLabsKey.trim(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      await new Promise((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); currentAudio = null; resolve(); };
        audio.play().catch(resolve);
      });
      onEnd?.();
      return;
    } catch (e) {
      console.warn("ElevenLabs failed, falling back to browser TTS:", e.message);
    }
  }

  // ── Browser TTS fallback ─────────────────────────────────────────────────────
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) { onEnd?.(); return; }

  const u = new SpeechSynthesisUtterance(text);

  if (isHindi) {
    u.lang = "hi-IN";
    u.rate = 0.88;   // slightly slower — Hindi needs a bit more time
    u.pitch = 1.05;
    const hindiVoice = await getHindiVoice();
    if (hindiVoice) {
      u.voice = hindiVoice;
      console.info("Using Hindi voice:", hindiVoice.name, hindiVoice.lang);
    } else {
      console.warn("No Hindi voice found on this device — using default. Install a Hindi TTS voice for better results.");
    }
  } else {
    u.rate = 1.0;
    u.pitch = 0.9;
  }

  u.onend  = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
}
