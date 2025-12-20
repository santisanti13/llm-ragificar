import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, FileText, MessageSquare, Loader2, Brain, Upload, Trash2, CheckCircle, AlertCircle, Clock, Settings, Mic } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { ChatInterface } from '@/components/ChatInterface';
import { TrainingConfig } from '@/components/TrainingConfig';
import { VoiceAssistant } from '@/components/VoiceAssistant';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
interface DocumentItem {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  chunk_count: number;
  error_message: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchProjectData();
    }
  }, [user, id]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, docsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('documents').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      ]);

      if (projectRes.error) throw projectRes.error;
      if (docsRes.error) throw docsRes.error;

      setProject(projectRes.data);
      setDocuments(docsRes.data || []);
    } catch (error: any) {
      toast.error('Error al cargar el proyecto');
      navigate('/dashboard');
    } finally {
      setLoadingData(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !id) return;

    const pdfFiles = acceptedFiles.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      toast.error('Solo se permiten archivos PDF');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      try {
        // Upload to storage
        const filePath = `${user.id}/${id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create document record
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            project_id: id,
            user_id: user.id,
            name: file.name,
            file_path: filePath,
            file_size: file.size,
            status: 'pending',
          })
          .select()
          .single();

        if (docError) throw docError;

        // Trigger processing
        const { error: processError } = await supabase.functions.invoke('process-document', {
          body: { documentId: docData.id },
        });

        if (processError) {
          console.error('Error triggering processing:', processError);
        }

        setUploadProgress(((i + 1) / pdfFiles.length) * 100);
      } catch (error: any) {
        toast.error(`Error al subir ${file.name}`);
      }
    }

    toast.success(`${pdfFiles.length} documento(s) subido(s). Procesando...`);
    setUploading(false);
    fetchProjectData();
  }, [user, id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    disabled: uploading,
  });

  const handleDeleteDocument = async (doc: DocumentItem) => {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;

    try {
      // Delete from storage
      await supabase.storage.from('documents').remove([doc.file_path]);
      
      // Delete record (cascade will delete chunks)
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;

      toast.success('Documento eliminado');
      fetchProjectData();
    } catch (error: any) {
      toast.error('Error al eliminar documento');
    }
  };

  const getStatusIcon = (status: DocumentItem['status']) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-warning" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: DocumentItem['status']) => {
    const variants: Record<DocumentItem['status'], string> = {
      ready: 'bg-success/10 text-success border-success/20',
      processing: 'bg-warning/10 text-warning border-warning/20',
      error: 'bg-destructive/10 text-destructive border-destructive/20',
      pending: 'bg-muted text-muted-foreground border-border',
    };
    const labels: Record<DocumentItem['status'], string> = {
      ready: 'Listo',
      processing: 'Procesando',
      error: 'Error',
      pending: 'Pendiente',
    };
    return <Badge variant="outline" className={variants[status]}>{labels[status]}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const readyDocuments = documents.filter(d => d.status === 'ready');

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-display font-bold">{project?.name}</h1>
              {project?.description && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Entrenamiento
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voz
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-6 animate-fade-in">
            {/* Upload zone */}
            <Card className="glass">
              <CardContent className="p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  {uploading ? (
                    <div className="space-y-2">
                      <p className="font-medium">Subiendo documentos...</p>
                      <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                    </div>
                  ) : isDragActive ? (
                    <p className="font-medium text-primary">Suelta los archivos aquí</p>
                  ) : (
                    <>
                      <p className="font-medium mb-1">Arrastra tus PDFs aquí</p>
                      <p className="text-sm text-muted-foreground">o haz clic para seleccionar archivos</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents list */}
            {documents.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">Sin documentos</h3>
                  <p className="text-muted-foreground">Sube tu primer PDF para comenzar</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map((doc, index) => (
                  <Card key={doc.id} className="glass animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        {getStatusIcon(doc.status)}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{formatFileSize(doc.file_size)}</span>
                            {doc.status === 'ready' && <span>{doc.chunk_count} chunks</span>}
                            <span>{format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}</span>
                          </div>
                          {doc.error_message && (
                            <p className="text-sm text-destructive mt-1">{doc.error_message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(doc.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="training" className="animate-fade-in">
            <TrainingConfig projectId={id!} />
          </TabsContent>

          <TabsContent value="chat" className="animate-fade-in">
            {readyDocuments.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">Chat no disponible</h3>
                  <p className="text-muted-foreground">
                    Sube y procesa al menos un documento para chatear con tu contenido
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ChatInterface projectId={id!} />
            )}
          </TabsContent>

          <TabsContent value="voice" className="animate-fade-in">
            {readyDocuments.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <Mic className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">Asistente de voz no disponible</h3>
                  <p className="text-muted-foreground">
                    Sube y procesa al menos un documento para usar el asistente de voz
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="max-w-md mx-auto">
                <VoiceAssistant projectId={id!} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}