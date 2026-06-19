import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mic, Square, Volume2, Loader2 } from 'lucide-react';

interface VoiceAssistantProps {
  projectId: string;
}

type Turn = { role: 'user' | 'assistant'; content: string };
type Phase = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking';

export function VoiceAssistant({ projectId }: VoiceAssistantProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [history, setHistory] = useState<Turn[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<Turn[]>([]);
  useEffect(() => { historyRef.current = history; }, [history]);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = useCallback(async () => {
    if (phase !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) =>
          MediaRecorder.isTypeSupported(t)
        ) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => void handleStop();
      recorder.start();
      recorderRef.current = recorder;
      setPhase('recording');
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.name === 'NotAllowedError'
          ? 'Permiso de micrófono denegado'
          : 'No se pudo acceder al micrófono'
      );
      cleanupStream();
    }
  }, [phase]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const handleStop = async () => {
    const recorder = recorderRef.current;
    const mime = recorder?.mimeType || 'audio/webm';
    cleanupStream();
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];
    if (blob.size < 2000) {
      toast.error('Grabación demasiado corta');
      setPhase('idle');
      return;
    }

    setPhase('transcribing');
    try {
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const form = new FormData();
      form.append('file', blob, `recording.${ext}`);

      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      if (!token) throw new Error('Sesión expirada');

      const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
      const sttRes = await fetch(`${SUPABASE_URL}/functions/v1/voice-stt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!sttRes.ok) {
        const err = await sttRes.json().catch(() => ({}));
        throw new Error(err.error || 'Error de transcripción');
      }
      const { text: userText } = await sttRes.json();
      if (!userText?.trim()) {
        toast.error('No se detectó voz');
        setPhase('idle');
        return;
      }

      const userTurn: Turn = { role: 'user', content: userText };
      setHistory((h) => [...h, userTurn]);

      // RAG chat (mismo backend que el asistente escrito) - fetch directo para leer SSE
      setPhase('thinking');
      const ragRes = await fetch(`${SUPABASE_URL}/functions/v1/rag-chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          messages: [...historyRef.current, userTurn].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      if (!ragRes.ok || !ragRes.body) {
        const err = await ragRes.json().catch(() => ({}));
        throw new Error(err.error || 'Error RAG');
      }

      let assistantText = '';
      const reader = ragRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const j = JSON.parse(payload);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) assistantText += delta;
          } catch { /* skip */ }
        }
      }

      assistantText = assistantText.trim();
      if (!assistantText) {
        toast.error('Respuesta vacía del asistente');
        setPhase('idle');
        return;
      }

      setHistory((h) => [...h, { role: 'assistant', content: assistantText }]);

      // TTS
      setPhase('speaking');
      const ttsRes = await fetch(`${SUPABASE_URL}/functions/v1/voice-tts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: assistantText, voice: 'alloy' }),
      });
      if (!ttsRes.ok) {
        const err = await ttsRes.json().catch(() => ({}));
        throw new Error(err.error || 'Error TTS');
      }
      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setPhase('idle');
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setPhase('idle');
      };
      await audio.play();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error en el flujo de voz');
      setPhase('idle');
    }
  };

  useEffect(() => {
    return () => {
      cleanupStream();
      audioRef.current?.pause();
    };
  }, []);

  const isBusy = phase !== 'idle' && phase !== 'recording';
  const statusText: Record<Phase, string> = {
    idle: 'Mantén pulsado para hablar',
    recording: 'Grabando... suelta para enviar',
    transcribing: 'Transcribiendo...',
    thinking: 'Pensando...',
    speaking: 'Hablando...',
  };

  return (
    <Card className="glass-strong">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-6">
          <div
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              phase === 'recording'
                ? 'gradient-primary glow scale-110'
                : phase === 'speaking'
                ? 'gradient-primary glow'
                : isBusy
                ? 'bg-primary/20 border-2 border-primary/50'
                : 'bg-muted/50 border-2 border-border'
            }`}
          >
            {phase === 'transcribing' || phase === 'thinking' ? (
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            ) : phase === 'speaking' ? (
              <Volume2 className="w-12 h-12 text-primary-foreground animate-pulse" />
            ) : phase === 'recording' ? (
              <Square className="w-12 h-12 text-primary-foreground" />
            ) : (
              <Mic className="w-12 h-12 text-muted-foreground" />
            )}
            {phase === 'recording' && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
                <div
                  className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping"
                  style={{ animationDelay: '0.2s' }}
                />
              </>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">{statusText[phase]}</p>

          <Button
            size="lg"
            disabled={isBusy}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => phase === 'recording' && stopRecording()}
            onTouchStart={(e) => {
              e.preventDefault();
              startRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            className={
              phase === 'recording'
                ? 'bg-destructive hover:bg-destructive/90'
                : 'gradient-primary glow hover:scale-105 transition-transform'
            }
          >
            {phase === 'recording' ? (
              <>
                <Square className="mr-2 h-5 w-5" /> Soltar para enviar
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" /> Mantén pulsado para hablar
              </>
            )}
          </Button>

          {history.length > 0 && (
            <div className="w-full mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Conversación</h4>
              <div className="bg-muted/50 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                {history.map((t, i) => (
                  <p
                    key={i}
                    className={`text-sm ${
                      t.role === 'user' ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    <span className="font-medium">
                      {t.role === 'user' ? 'Tú: ' : 'Asistente: '}
                    </span>
                    {t.content}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
