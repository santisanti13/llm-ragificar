import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Plus, Trash2, MessageCircle, Sparkles, Loader2, SlidersHorizontal, BookTemplate, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface TrainingExample {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
}

interface ProjectTraining {
  system_prompt: string;
  first_message: string;
  temperature: number;
  similarity_threshold: number;
  match_count: number;
  chunk_size: number;
  chunk_overlap: number;
  model: string;
}

interface TrainingConfigProps {
  projectId: string;
}

const PROMPT_TEMPLATES = [
  {
    name: 'Soporte técnico',
    icon: '🛠️',
    system_prompt: `Eres un agente de soporte técnico experto. Tus respuestas deben ser:
- Claras y paso a paso
- Incluir soluciones específicas basadas en la documentación
- Amables y profesionales
- Si no encuentras la solución en el contexto, sugiere contactar soporte humano

Siempre responde en español.`,
    first_message: '¡Hola! Soy tu asistente de soporte técnico. ¿En qué puedo ayudarte hoy?',
  },
  {
    name: 'Ventas / Producto',
    icon: '💼',
    system_prompt: `Eres un asistente de ventas experto en el producto. Tus respuestas deben:
- Destacar beneficios y características relevantes
- Responder preguntas sobre precios y planes con precisión
- Ser persuasivas pero honestas
- Guiar al usuario hacia la acción (compra, demo, contacto)

Si no tienes información sobre algo, invita al usuario a contactar al equipo comercial. Responde en español.`,
    first_message: '¡Bienvenido! Estoy aquí para ayudarte a conocer nuestro producto. ¿Qué te gustaría saber?',
  },
  {
    name: 'FAQ / Base de conocimiento',
    icon: '📚',
    system_prompt: `Eres un asistente de preguntas frecuentes. Tus respuestas deben ser:
- Concisas y directas
- Basadas estrictamente en la documentación proporcionada
- Organizadas con viñetas cuando sea apropiado
- Si hay múltiples respuestas posibles, presenta todas las opciones

Si la pregunta no está cubierta en el contexto, indícalo claramente. Responde en español.`,
    first_message: '¡Hola! Pregúntame lo que necesites, buscaré la respuesta en nuestra base de conocimiento.',
  },
  {
    name: 'Legal / Compliance',
    icon: '⚖️',
    system_prompt: `Eres un asistente especializado en documentación legal y compliance. Tus respuestas deben:
- Ser precisas y citar las secciones relevantes del documento
- Incluir disclaimers cuando corresponda
- No dar consejos legales, solo informar sobre el contenido documentado
- Recomendar consultar con un profesional legal para decisiones importantes

Responde siempre en español con tono formal.`,
    first_message: 'Bienvenido. Puedo ayudarte a consultar información en nuestros documentos legales. ¿Qué necesitas saber?',
  },
];

const MODELS = [
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini Flash Lite', desc: 'Más rápido, menor costo' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini Flash', desc: 'Equilibrado (recomendado)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini Pro', desc: 'Mayor calidad, más lento' },
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', desc: 'Nueva generación, rápido' },
];

export function TrainingConfig({ projectId }: TrainingConfigProps) {
  const [training, setTraining] = useState<ProjectTraining>({
    system_prompt: '',
    first_message: '',
    temperature: 0.7,
    similarity_threshold: 0.3,
    match_count: 8,
    chunk_size: 1000,
    chunk_overlap: 200,
    model: 'google/gemini-2.5-flash',
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
          temperature: trainingRes.data.temperature ?? 0.7,
          similarity_threshold: trainingRes.data.similarity_threshold ?? 0.3,
          match_count: trainingRes.data.match_count ?? 8,
          chunk_size: trainingRes.data.chunk_size ?? 1000,
          chunk_overlap: trainingRes.data.chunk_overlap ?? 200,
          model: trainingRes.data.model || 'google/gemini-2.5-flash',
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
      const payload = {
        system_prompt: training.system_prompt,
        first_message: training.first_message,
        temperature: training.temperature,
        similarity_threshold: training.similarity_threshold,
        match_count: training.match_count,
        chunk_size: training.chunk_size,
        chunk_overlap: training.chunk_overlap,
        model: training.model,
      };

      const { data: existing } = await supabase
        .from('project_training')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('project_training')
          .update(payload)
          .eq('project_id', projectId);
      } else {
        await supabase
          .from('project_training')
          .insert({ project_id: projectId, ...payload });
      }

      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = (template: typeof PROMPT_TEMPLATES[0]) => {
    setTraining({
      ...training,
      system_prompt: template.system_prompt,
      first_message: template.first_message,
    });
    toast.success(`Plantilla "${template.name}" aplicada. Recuerda guardar los cambios.`);
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
      {/* Prompt Templates */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-primary" />
            Plantillas de System Prompt
          </CardTitle>
          <CardDescription>
            Selecciona una plantilla prediseñada como punto de partida. Puedes personalizarla después.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PROMPT_TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => handleApplyTemplate(template)}
                className="p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all text-left group"
              >
                <span className="text-2xl mb-2 block">{template.icon}</span>
                <p className="font-medium text-sm group-hover:text-primary transition-colors">{template.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {template.system_prompt.substring(0, 80)}...
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

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
              placeholder="Ej: Eres un asistente experto en soporte técnico. Responde de forma concisa y amable..."
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
        </CardContent>
      </Card>

      {/* Retrieval Parameters */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Parámetros de Retrieval
          </CardTitle>
          <CardDescription>
            Ajusta cómo el sistema busca y usa la información de tus documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Modelo de IA</Label>
            <Select value={training.model} onValueChange={(v) => setTraining({ ...training, model: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex items-center gap-2">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">— {m.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperatura</Label>
              <Badge variant="secondary" className="font-mono">{training.temperature.toFixed(2)}</Badge>
            </div>
            <Slider
              value={[training.temperature]}
              onValueChange={([v]) => setTraining({ ...training, temperature: v })}
              min={0}
              max={1.5}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Baja (0.0-0.3): respuestas precisas y consistentes. Alta (0.8-1.5): respuestas más creativas y variadas.
            </p>
          </div>

          {/* Similarity Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Umbral de similitud</Label>
              <Badge variant="secondary" className="font-mono">{training.similarity_threshold.toFixed(2)}</Badge>
            </div>
            <Slider
              value={[training.similarity_threshold]}
              onValueChange={([v]) => setTraining({ ...training, similarity_threshold: v })}
              min={0.1}
              max={0.9}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Bajo (0.1-0.3): incluye más contexto, puede ser menos relevante. Alto (0.6-0.9): solo contexto muy relevante.
            </p>
          </div>

          {/* Match Count */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Chunks de contexto</Label>
              <Badge variant="secondary" className="font-mono">{training.match_count}</Badge>
            </div>
            <Slider
              value={[training.match_count]}
              onValueChange={([v]) => setTraining({ ...training, match_count: v })}
              min={1}
              max={20}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Cuántos fragmentos de documento se incluyen como contexto. Más = más info pero mayor latencia y costo.
            </p>
          </div>

          <Separator />

          {/* Chunk Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tamaño de chunk (caracteres)</Label>
              <Badge variant="secondary" className="font-mono">{training.chunk_size}</Badge>
            </div>
            <Slider
              value={[training.chunk_size]}
              onValueChange={([v]) => setTraining({ ...training, chunk_size: v })}
              min={200}
              max={3000}
              step={100}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Tamaño de cada fragmento al procesar documentos. Afecta solo a nuevos documentos subidos.
            </p>
          </div>

          {/* Chunk Overlap */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Overlap de chunks (caracteres)</Label>
              <Badge variant="secondary" className="font-mono">{training.chunk_overlap}</Badge>
            </div>
            <Slider
              value={[training.chunk_overlap]}
              onValueChange={([v]) => setTraining({ ...training, chunk_overlap: Math.min(v, training.chunk_size - 100) })}
              min={0}
              max={Math.min(500, training.chunk_size - 100)}
              step={50}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Solapamiento entre chunks consecutivos. Mejora la continuidad del contexto. Afecta solo a nuevos documentos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveTraining} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar toda la configuración
        </Button>
      </div>

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
                placeholder="Ej: Para configurar la autenticación, primero ve a Configuración > Seguridad..."
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
