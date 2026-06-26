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

function chunkText(text: string, maxWords = 280): string[] {
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

async function fetchChunkPcm(text: string, signal: AbortSignal): Promise<Uint8Array> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/tts-blog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ text, voice: "nova" }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const pieces: Uint8Array[] = [];
  let buf = "";
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const payload = JSON.parse(data);
        if (payload.type === "speech.audio.delta" && payload.audio) {
          const bin = atob(payload.audio);
          const bytes = new Uint8Array(bin.length);
          for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
          pieces.push(bytes);
          total += bytes.length;
        }
      } catch { /* ignore */ }
    }
  }
  const merged = new Uint8Array(total);
  let o = 0;
  for (const p of pieces) { merged.set(p, o); o += p.length; }
  return merged;
}

function pcmToAudioBuffer(ctx: AudioContext, pcm: Uint8Array): AudioBuffer {
  const usable = pcm.length - (pcm.length % 2);
  const aligned = new Uint8Array(usable);
  aligned.set(pcm.subarray(0, usable));
  const samples = new Int16Array(aligned.buffer);
  const floats = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) floats[i] = samples[i] / 32768;
  const buffer = ctx.createBuffer(1, floats.length, 24000);
  buffer.copyToChannel(floats, 0);
  return buffer;
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface Props {
  title: string;
  contentMd: string;
}

export default function BlogAudioPlayer({ title, contentMd }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [progress, setProgress] = useState({ chunk: 0, total: 0 });
  const [elapsed, setElapsed] = useState(0); // seconds played from start
  const [estTotal, setEstTotal] = useState(0); // estimated total seconds
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const nextStartRef = useRef(0);
  const playStartTimeRef = useRef(0); // ctx.currentTime when playback began
  const rafRef = useRef<number | null>(null);

  const cleanup = () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    try { sourceRef.current?.stop(); } catch { /* noop */ }
    sourceRef.current = null;
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (ctxRef.current) { try { ctxRef.current.close(); } catch { /* noop */ } }
    ctxRef.current = null;
    nextStartRef.current = 0;
    playStartTimeRef.current = 0;
  };

  useEffect(() => () => cleanup(), []);

  const tick = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const e = Math.max(0, ctx.currentTime - playStartTimeRef.current);
    setElapsed(e);
    rafRef.current = requestAnimationFrame(tick);
  };

  const handlePause = async () => {
    if (ctxRef.current && state === "playing") {
      await ctxRef.current.suspend();
      setState("paused");
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }
  };
  const handleResume = async () => {
    if (ctxRef.current && state === "paused") {
      await ctxRef.current.resume();
      setState("playing");
      rafRef.current = requestAnimationFrame(tick);
    }
  };
  const handleStop = () => {
    cleanup();
    setState("idle");
    setProgress({ chunk: 0, total: 0 });
    setElapsed(0);
    setEstTotal(0);
  };

  const handlePlay = async () => {
    cancelledRef.current = false;
    setState("loading");
    setElapsed(0);

    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new Ctx();
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    ctxRef.current = ctx;
    nextStartRef.current = 0;

    const fullText = `${title}. ${stripMarkdown(contentMd)}`;
    const chunks = chunkText(fullText, 260);
    setProgress({ chunk: 0, total: chunks.length });

    // Rough estimate: ~150 words/min spoken, ~260 words per chunk => ~104s per chunk
    // We refine after first chunk decodes (real duration known).
    let perChunkDur = 95;
    setEstTotal(perChunkDur * chunks.length);

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (cancelledRef.current) return;
        setProgress({ chunk: i + 1, total: chunks.length });
        const ac = new AbortController();
        abortRef.current = ac;

        const pcm = await fetchChunkPcm(chunks[i], ac.signal);
        if (cancelledRef.current || !ctxRef.current) return;

        const buffer = pcmToAudioBuffer(ctxRef.current, pcm);
        // refine estimate using moving average of real chunk durations
        perChunkDur = (perChunkDur * i + buffer.duration) / (i + 1);
        setEstTotal(perChunkDur * chunks.length);

        const source = ctxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(ctxRef.current.destination);

        const now = ctxRef.current.currentTime;
        const startAt = Math.max(now + 0.05, nextStartRef.current);
        source.start(startAt);
        if (i === 0) {
          playStartTimeRef.current = startAt;
          if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
        }
        nextStartRef.current = startAt + buffer.duration;
        sourceRef.current = source;
        setState("playing");

        if (i < chunks.length - 1) {
          const waitMs = Math.max(0, (nextStartRef.current - ctxRef.current.currentTime - 1.5) * 1000);
          if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
        } else {
          // exact total now known
          setEstTotal(nextStartRef.current - playStartTimeRef.current);
          await new Promise<void>((resolve) => {
            source.onended = () => resolve();
            const safety = (buffer.duration + 1) * 1000;
            setTimeout(() => resolve(), safety);
          });
          if (!cancelledRef.current) handleStop();
        }
      }
    } catch (e) {
      if (!cancelledRef.current) {
        console.error("[tts] error", e);
        handleStop();
      }
    }
  };

  const pct = estTotal > 0 ? Math.min(100, (elapsed / estTotal) * 100) : 0;
  const isActive = state === "playing" || state === "paused" || state === "loading";

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[#D4FF00]">
          <Volume2 className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold">Escuchar</span>
        </div>
        <div className="flex-1 min-w-[120px] text-xs text-white/50 italic">
          {state === "idle" && "Narración con voz orgánica"}
          {state === "loading" && "Preparando audio..."}
          {state === "playing" && progress.total > 0 && `Reproduciendo · ${progress.chunk}/${progress.total}`}
          {state === "paused" && "Pausado"}
        </div>
        <div className="flex items-center gap-2">
          {state === "idle" && (
            <button onClick={handlePlay} className="flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#AAFF00] transition-colors">
              <Play className="w-3.5 h-3.5" /> Play
            </button>
          )}
          {state === "loading" && (
            <button disabled className="flex items-center gap-2 bg-white/10 text-white/60 px-3 py-1.5 rounded-lg text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando
            </button>
          )}
          {state === "playing" && (
            <button onClick={handlePause} className="flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#AAFF00] transition-colors">
              <Pause className="w-3.5 h-3.5" /> Pausa
            </button>
          )}
          {state === "paused" && (
            <button onClick={handleResume} className="flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#AAFF00] transition-colors">
              <Play className="w-3.5 h-3.5" /> Reanudar
            </button>
          )}
          {isActive && (
            <button onClick={handleStop} className="text-xs text-white/50 hover:text-white px-2">
              Detener
            </button>
          )}
        </div>
      </div>

      {/* Progress bar — full track from start to end */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] tabular-nums text-white/50 w-9 text-right">
          {formatTime(elapsed)}
        </span>
        <div className="relative flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#AAFF00] to-[#D4FF00] transition-[width] duration-200 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-white/50 w-9">
          {formatTime(estTotal)}
        </span>
      </div>
    </div>
  );
}
