import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Volume2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>#~]+/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text: string, maxWords = 300): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  const wc = (s: string) => (s.match(/\S+/g) ?? []).length;
  for (const s of sentences) {
    if (wc(s) > maxWords) {
      if (cur.trim()) { chunks.push(cur.trim()); cur = ""; }
      const words = s.match(/\S+/g) ?? [];
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(" "));
      }
      continue;
    }
    if (cur && wc(cur) + wc(s) > maxWords) { chunks.push(cur.trim()); cur = ""; }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

interface Props {
  title: string;
  contentMd: string;
}

export default function BlogAudioPlayer({ title, contentMd }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [progress, setProgress] = useState({ chunk: 0, total: 0 });
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playheadRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const stopAll = () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
    sourcesRef.current = [];
    if (ctxRef.current) { try { ctxRef.current.close(); } catch { /* noop */ } }
    ctxRef.current = null;
    gainRef.current = null;
    playheadRef.current = 0;
  };

  useEffect(() => () => stopAll(), []);

  const handlePause = async () => {
    if (ctxRef.current && state === "playing") {
      await ctxRef.current.suspend();
      setState("paused");
    }
  };

  const handleResume = async () => {
    if (ctxRef.current && state === "paused") {
      await ctxRef.current.resume();
      setState("playing");
    }
  };

  const handleStop = () => {
    stopAll();
    setState("idle");
    setProgress({ chunk: 0, total: 0 });
  };

  const handlePlay = async () => {
    cancelledRef.current = false;
    setState("loading");

    const ctx = new AudioContext({ sampleRate: 24000 });
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    const gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(ctx.destination);
    ctxRef.current = ctx;
    gainRef.current = gain;
    playheadRef.current = 0;

    const fullText = `${title}. ${stripMarkdown(contentMd)}`;
    const chunks = chunkText(fullText, 280);
    setProgress({ chunk: 0, total: chunks.length });

    let pending = new Uint8Array(0);
    const playPcm = (incoming: Uint8Array) => {
      if (!ctxRef.current || !gainRef.current) return;
      const bytes = new Uint8Array(pending.length + incoming.length);
      bytes.set(pending);
      bytes.set(incoming, pending.length);
      const usable = bytes.length - (bytes.length % 2);
      pending = bytes.slice(usable);
      if (usable === 0) return;
      const samples = new Int16Array(bytes.buffer, 0, usable / 2);
      const floats = Float32Array.from(samples, (s) => s / 32768);
      const buffer = ctxRef.current.createBuffer(1, floats.length, 24000);
      buffer.copyToChannel(floats, 0);
      const source = ctxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(gainRef.current);
      if (playheadRef.current === 0) {
        playheadRef.current = ctxRef.current.currentTime + 0.1;
      } else {
        playheadRef.current = Math.max(playheadRef.current, ctxRef.current.currentTime);
      }
      source.start(playheadRef.current);
      playheadRef.current += buffer.duration;
      sourcesRef.current.push(source);
    };

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (cancelledRef.current) return;
        setProgress({ chunk: i + 1, total: chunks.length });
        const ac = new AbortController();
        abortRef.current = ac;

        const res = await fetch(`${SUPABASE_URL}/functions/v1/tts-blog`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: chunks[i], voice: "nova" }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`TTS failed: ${res.status}`);
        }
        if (state !== "playing") setState("playing");

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buf = "";
        pending = new Uint8Array(0);
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (cancelledRef.current) { try { reader.cancel(); } catch { /* noop */ } return; }
          buf += value;
          const events = buf.split("\n\n");
          buf = events.pop() ?? "";
          for (const evt of events) {
            for (const line of evt.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const payload = JSON.parse(data);
                if (payload.type === "speech.audio.delta" && payload.audio) {
                  const bin = atob(payload.audio);
                  const bytes = new Uint8Array(bin.length);
                  for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
                  playPcm(bytes);
                }
              } catch { /* ignore */ }
            }
          }
        }
        setState("playing");
      }
    } catch (e) {
      if (!cancelledRef.current) {
        console.error("Audio playback error", e);
        handleStop();
      }
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 text-[#D4FF00]">
        <Volume2 className="w-4 h-4" />
        <span className="text-[10px] uppercase tracking-[0.25em] font-bold">Escuchar</span>
      </div>
      <div className="flex-1 text-xs text-white/50 italic">
        {state === "idle" && "Narración con voz orgánica"}
        {state === "loading" && "Preparando audio..."}
        {state === "playing" && progress.total > 0 && `Reproduciendo · ${progress.chunk}/${progress.total}`}
        {state === "paused" && "Pausado"}
      </div>
      <div className="flex items-center gap-2">
        {state === "idle" && (
          <button
            onClick={handlePlay}
            className="flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#AAFF00] transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Play
          </button>
        )}
        {state === "loading" && (
          <button disabled className="flex items-center gap-2 bg-white/10 text-white/60 px-3 py-1.5 rounded-lg text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando
          </button>
        )}
        {state === "playing" && (
          <button
            onClick={handlePause}
            className="flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#AAFF00] transition-colors"
          >
            <Pause className="w-3.5 h-3.5" /> Pausa
          </button>
        )}
        {state === "paused" && (
          <button
            onClick={handleResume}
            className="flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#AAFF00] transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Reanudar
          </button>
        )}
        {(state === "playing" || state === "paused" || state === "loading") && (
          <button
            onClick={handleStop}
            className="text-xs text-white/50 hover:text-white px-2"
          >
            Detener
          </button>
        )}
      </div>
    </div>
  );
}
