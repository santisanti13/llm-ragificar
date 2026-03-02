import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Sparkles, Check, X, Save, Loader2, Lightbulb } from 'lucide-react';

interface QuestionPair {
  question: string;
  answer: string;
  selected: boolean;
}

interface SuggestedQuestionsProps {
  projectId: string;
  documentId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SuggestedQuestions({ projectId, documentId, onClose, onSaved }: SuggestedQuestionsProps) {
  const [questions, setQuestions] = useState<QuestionPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: { documentId },
      });

      if (error) throw error;

      if (data?.questions?.length > 0) {
        setQuestions(data.questions.map((q: any) => ({ ...q, selected: true })));
        setGenerated(true);
      } else {
        toast.error('No se pudieron generar preguntas para este documento');
      }
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast.error('Error al generar preguntas sugeridas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const selected = questions.filter(q => q.selected);
    if (selected.length === 0) {
      toast.error('Selecciona al menos una pregunta');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('training_examples')
        .insert(selected.map(q => ({
          project_id: projectId,
          question: q.question,
          answer: q.answer,
          is_active: true,
        })));

      if (error) throw error;

      toast.success(`${selected.length} ejemplo(s) de entrenamiento guardados`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error('Error al guardar ejemplos');
    } finally {
      setSaving(false);
    }
  };

  const updateQuestion = (index: number, field: 'question' | 'answer', value: string) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const toggleSelect = (index: number) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, selected: !q.selected } : q));
  };

  if (!generated) {
    return (
      <Card className="glass border-primary/30">
        <CardContent className="p-6 text-center">
          <Lightbulb className="h-10 w-10 mx-auto mb-3 text-primary" />
          <h3 className="font-semibold mb-2">Mejorar tu RAG</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Generamos 5 preguntas y respuestas basadas en el documento para entrenar tu asistente.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onClose}>
              Omitir
            </Button>
            <Button onClick={generateQuestions} disabled={loading} className="gradient-primary">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generar preguntas
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Preguntas sugeridas
        </CardTitle>
        <CardDescription>
          Edita y selecciona las preguntas que quieres guardar como ejemplos de entrenamiento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border transition-all ${
              q.selected
                ? 'border-primary/40 bg-primary/5'
                : 'border-border/50 bg-muted/30 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSelect(index)}
                className={q.selected ? 'text-primary' : 'text-muted-foreground'}
              >
                {q.selected ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Pregunta</label>
                <Input
                  value={q.question}
                  onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Respuesta</label>
                <Textarea
                  value={q.answer}
                  onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gradient-primary">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar ({questions.filter(q => q.selected).length})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
