// Deepgram WebSocket STT — falls back to browser SpeechRecognition if no key

export const DG_KEY = "nexus_deepgram_key";
export function loadDeepgramKey() { return typeof window !== "undefined" ? sessionStorage.getItem(DG_KEY) || "" : ""; }
export function saveDeepgramKey(k) { sessionStorage.setItem(DG_KEY, k); }

export class DeepgramSTT {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.socket = null;
    this.mediaRecorder = null;
    this.stream = null;
  }

  async start({ onInterim, onFinal, onError }) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const params = new URLSearchParams({
        model: "nova-2",
        punctuate: "true",
        interim_results: "true",
        endpointing: "300",
        smart_format: "true",
      });

      this.socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?${params}`,
        ["token", this.apiKey]
      );

      this.socket.onopen = () => {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(e.data);
          }
        };
        this.mediaRecorder.start(200);
      };

      this.socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const alt = data?.channel?.alternatives?.[0];
          if (!alt?.transcript) return;
          if (data.is_final) onFinal?.(alt.transcript);
          else onInterim?.(alt.transcript);
        } catch {}
      };

      this.socket.onerror = () => onError?.("Deepgram connection failed");
    } catch (err) {
      onError?.(err.message || "Microphone access denied");
    }
  }

  stop() {
    try { this.mediaRecorder?.stop(); } catch {}
    try {
      if (this.socket?.readyState === WebSocket.OPEN) this.socket.close();
    } catch {}
    try { this.stream?.getTracks().forEach(t => t.stop()); } catch {}
    this.socket = null;
    this.mediaRecorder = null;
    this.stream = null;
  }
}
