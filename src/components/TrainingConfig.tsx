import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Plus, Trash2, MessageCircle, Sparkles, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface TrainingExample {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
}

interface ProjectTraining {
  system_prompt: string;
  first_message: string;
}

interface TrainingConfigProps {
  projectId: string;
}

export function TrainingConfig({ projectId }: TrainingConfigProps) {
  const [training, setTraining] = useState<ProjectTraining>({
    system_prompt: '',
    first_message: '',
  });
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingExample, setAddingExample] = useState(false);

  useEffect(() => {
    fetchTrainingData();
  }, [projectId]);

  const fetchTrainingData = async () => {
    try {
      const [trainingRes, examplesRes] = await Promise.all([
        supabase
          .from('project_training')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle(),
        supabase
          .from('training_examples')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true }),
      ]);

      if (trainingRes.data) {
        setTraining({
          system_prompt: trainingRes.data.system_prompt || '',
          first_message: trainingRes.data.first_message || '',
        });
      }

      setExamples(examplesRes.data || []);
    } catch (error) {
      console.error('Error fetching training:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTraining = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('project_training')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('project_training')
          .update({
            system_prompt: training.system_prompt,
            first_message: training.first_message,
          })
          .eq('project_id', projectId);
      } else {
        await supabase
          .from('project_training')
          .insert({
            project_id: projectId,
            system_prompt: training.system_prompt,
            first_message: training.first_message,
          });
      }

      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExample = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error('Completa pregunta y respuesta');
      return;
    }

    setAddingExample(true);
    try {
      const { data, error } = await supabase
        .from('training_examples')
        .insert({
          project_id: projectId,
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setExamples([...examples, data]);
      setNewQuestion('');
      setNewAnswer('');
      toast.success('Ejemplo añadido');
    } catch (error) {
      toast.error('Error al añadir ejemplo');
    } finally {
      setAddingExample(false);
    }
  };

  const handleToggleExample = async (id: string, isActive: boolean) => {
    try {
      await supabase
        .from('training_examples')
        .update({ is_active: isActive })
        .eq('id', id);

      setExamples(examples.map(ex => 
        ex.id === id ? { ...ex, is_active: isActive } : ex
      ));
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleDeleteExample = async (id: string) => {
    if (!confirm('¿Eliminar este ejemplo?')) return;

    try {
      await supabase.from('training_examples').delete().eq('id', id);
      setExamples(examples.filter(ex => ex.id !== id));
      toast.success('Ejemplo eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeExamplesCount = examples.filter(ex => ex.is_active).length;

  return (
    <div className="space-y-6">
      {/* System Prompt */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            System Prompt
          </CardTitle>
          <CardDescription>
            Define las instrucciones principales del RAG. Esto determina cómo responde el asistente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system-prompt">Instrucciones del sistema</Label>
            <Textarea
              id="system-prompt"
              placeholder="Ej: Eres un asistente experto en soporte técnico. Responde de forma concisa y amable. Si no encuentras la información en el contexto, indica que no tienes esa información..."
              value={training.system_prompt}
              onChange={(e) => setTraining({ ...training, system_prompt: e.target.value })}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="first-message">Mensaje inicial (opcional)</Label>
            <Input
              id="first-message"
              placeholder="Ej: ¡Hola! Soy tu asistente de documentación. ¿En qué puedo ayudarte?"
              value={training.first_message}
              onChange={(e) => setTraining({ ...training, first_message: e.target.value })}
            />
          </div>

          <Button onClick={handleSaveTraining} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar configuración
          </Button>
        </CardContent>
      </Card>

      {/* Training Examples */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Ejemplos de Entrenamiento
            {activeExamplesCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({activeExamplesCount} activos)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Añade pares pregunta-respuesta esperados. El RAG usará estos ejemplos para aprender el estilo de respuesta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add new example */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="space-y-2">
              <Label htmlFor="new-question">Pregunta esperada</Label>
              <Input
                id="new-question"
                placeholder='Ej: "¿Cómo configuro la autenticación?"'
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-answer">Respuesta ideal</Label>
              <Textarea
                id="new-answer"
                placeholder="Ej: Para configurar la autenticación, primero ve a Configuración > Seguridad y activa el módulo de autenticación. Luego..."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={handleAddExample} disabled={addingExample} size="sm">
              {addingExample ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Añadir ejemplo
            </Button>
          </div>

          <Separator />

          {/* Examples list */}
          {examples.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No hay ejemplos de entrenamiento aún</p>
              <p className="text-sm">Añade tu primer par pregunta-respuesta arriba</p>
            </div>
          ) : (
            <div className="space-y-4">
              {examples.map((example, index) => (
                <div
                  key={example.id}
                  className={`p-4 rounded-lg border transition-all ${
                    example.is_active
                      ? 'bg-card border-primary/20'
                      : 'bg-muted/20 border-border/50 opacity-60'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div>
                        <span className="text-xs font-medium text-primary uppercase tracking-wider">Pregunta</span>
                        <p className="text-sm font-medium">{example.question}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Respuesta</span>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{example.answer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={example.is_active}
                          onCheckedChange={(checked) => handleToggleExample(example.id, checked)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {example.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteExample(example.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}