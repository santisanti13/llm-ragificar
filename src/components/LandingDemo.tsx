import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Loader2, Sparkles, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const SUGGESTIONS = [
  '¿De qué trata este documento?',
  'Resume los puntos clave en 3 viñetas.',
  '¿Cuáles son las cifras o datos más importantes?',
];

export default function LandingDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error('Archivo demasiado grande (máx 2MB)');
      return;
    }
    setFile(f);
    setAnswer('');
    setError(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const run = async (q?: string) => {
    const actualQ = (q ?? question).trim();
    if (!file) return toast.error('Sube primero un documento');
    if (!actualQ) return toast.error('Escribe una pregunta');

    setLoading(true);
    setAnswer('');
    setError(null);
    abortRef.current = new AbortController();

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('question', actualQ);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/demo-rag`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${PUBLISHABLE_KEY}` },
        body: fd,
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(j.error || `Error ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            if (json.delta) setAnswer((prev) => prev + json.delta);
          } catch { /* skip */ }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(e.message || 'Error generando respuesta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="demo" className="py-24 md:py-32 border-t border-border">
      <div className="container mx-auto px-6">
        <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">Demo en vivo</p>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 max-w-3xl">
          Pruébalo ahora.{' '}
          <span className="text-primary">Sin registro.</span>
        </h2>
        <p className="text-muted-foreground mb-12 max-w-2xl">
          Sube un PDF, TXT o Markdown (máx 2MB), haz una pregunta y mira cómo RAGify
          responde en tiempo real usando solo el contenido de tu documento.
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload + question */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-5">
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/60 transition-colors rounded-lg p-8 text-center cursor-pointer"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.md,.markdown,text/plain,application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-mono truncate max-w-xs">{file.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setAnswer(''); }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Quitar archivo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra o haz clic para subir <span className="text-foreground font-medium">PDF, TXT o MD</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Máx 2MB · 5 demos/día</p>
                </>
              )}
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Haz una pregunta sobre tu documento..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
                disabled={loading}
              />
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={loading || !file}
                    onClick={() => { setQuestion(s); run(s); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/60 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => run()}
                disabled={loading || !file || !question.trim()}
                className="gradient-primary w-full font-mono text-xs tracking-wider"
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> GENERANDO...</> : <><Sparkles className="h-4 w-4 mr-2" /> PREGUNTAR</>}
              </Button>
            </div>
          </div>

          {/* Answer */}
          <div className="bg-card border border-border rounded-lg p-6 min-h-[320px] flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs tracking-widest text-muted-foreground">
                RESPUESTA RAG · STREAMING
              </span>
            </div>
            {error ? (
              <div className="flex items-start gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : answer ? (
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {answer}
                {loading && <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse align-middle" />}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground flex-1 flex items-center justify-center text-center">
                {loading ? (
                  <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Leyendo tu documento...</div>
                ) : (
                  <p>La respuesta aparecerá aquí en tiempo real.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
