import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, FolderOpen, Loader2, LogOut, Search, Calendar, FileText, MoreVertical, Pencil, Trash2, Sparkles, MessageSquare, ChevronRight, BarChart3, Key, Activity, Zap, TrendingUp, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import logo from '@/assets/logo.png';
import logoWhite from '@/assets/logo-white.png';
import { UsageStats } from '@/components/UsageStats';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  document_count?: number;
  chunk_count?: number;
  api_key_count?: number;
  query_count?: number;
}

interface RecentQuery {
  id: string;
  query: string;
  status: string;
  latency_ms: number;
  created_at: string;
  project_id: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalApiQueries, setTotalApiQueries] = useState(0);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [avgLatency, setAvgLatency] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchApiStats();
    }
  }, [user]);

  // Polling for real-time document status
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchProjects, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchApiStats = async () => {
    try {
      const [countRes, recentRes] = await Promise.all([
        supabase.from('api_query_logs').select('*', { count: 'exact', head: true }),
        supabase.from('api_query_logs').select('id, query, status, latency_ms, created_at, project_id').order('created_at', { ascending: false }).limit(5),
      ]);
      setTotalApiQueries(countRes.count || 0);
      setRecentQueries(recentRes.data || []);

      if (recentRes.data && recentRes.data.length > 0) {
        const avg = recentRes.data.reduce((sum, q) => sum + q.latency_ms, 0) / recentRes.data.length;
        setAvgLatency(Math.round(avg));
      }
    } catch (error) {
      console.error('Error fetching API stats:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const projectsWithCounts = await Promise.all(
        (projectsData || []).map(async (project) => {
          const [docsRes, chunksRes, keysRes, queriesRes] = await Promise.all([
            supabase.from('documents').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
            supabase.from('document_chunks').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
            supabase.from('project_api_keys').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
            supabase.from('api_query_logs').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
          ]);
          return {
            ...project,
            document_count: docsRes.count || 0,
            chunk_count: chunksRes.count || 0,
            api_key_count: keysRes.count || 0,
            query_count: queriesRes.count || 0,
          };
        })
      );

      setProjects(projectsWithCounts);
    } catch (error: any) {
      toast.error('Error al cargar proyectos');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('El nombre del proyecto es requerido');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('projects').insert({
        name: newProject.name.trim(),
        description: newProject.description.trim() || null,
        user_id: user!.id,
      });

      if (error) throw error;

      toast.success('Proyecto creado exitosamente');
      setIsCreateOpen(false);
      setNewProject({ name: '', description: '' });
      fetchProjects();
    } catch (error: any) {
      toast.error('Error al crear proyecto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProject = async () => {
    if (!editingProject || !editingProject.name.trim()) {
      toast.error('El nombre del proyecto es requerido');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editingProject.name.trim(),
          description: editingProject.description?.trim() || null,
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      toast.success('Proyecto actualizado');
      setIsEditOpen(false);
      setEditingProject(null);
      fetchProjects();
    } catch (error: any) {
      toast.error('Error al actualizar proyecto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`¿Estás seguro de eliminar "${project.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) throw error;
      toast.success('Proyecto eliminado');
      fetchProjects();
    } catch (error: any) {
      toast.error('Error al eliminar proyecto');
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDocuments = projects.reduce((acc, p) => acc + (p.document_count || 0), 0);
  const totalChunks = projects.reduce((acc, p) => acc + (p.chunk_count || 0), 0);
  const totalApiKeys = projects.reduce((acc, p) => acc + (p.api_key_count || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-dots opacity-50 pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex-1" />
          <div className="absolute left-1/2 -translate-x-1/2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-60 bg-neon-green/40 scale-125" />
              <img src={logo} alt="RAGify" className="relative h-24 w-auto -my-6 dark:hidden" />
              <img src={logoWhite} alt="RAGify" className="relative h-24 w-auto -my-6 hidden dark:block" />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-1 justify-end">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                await signOut();
                navigate('/');
              }} 
              className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-8 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold mb-1">Bienvenido de vuelta</h1>
          <p className="text-muted-foreground">Gestiona tus proyectos RAG y bases de conocimiento</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={FolderOpen} label="Proyectos" value={projects.length} accent />
          <StatCard icon={FileText} label="Documentos" value={totalDocuments} />
          <StatCard icon={Sparkles} label="Chunks" value={totalChunks} />
          <StatCard icon={Key} label="API Keys" value={totalApiKeys} />
          <div className="cursor-pointer" onClick={() => navigate('/analytics')}>
            <StatCard icon={MessageSquare} label="Consultas API" value={totalApiQueries} trend={avgLatency > 0 ? `~${avgLatency}ms` : undefined} />
          </div>
        </div>

        {/* Usage Stats */}
        <UsageStats />

        {/* Activity feed + Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent API activity */}
          <div className="lg:col-span-2">
            <Card className="glass">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Actividad reciente
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
                    Ver todo <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentQueries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Sin consultas API aún</p>
                    <p className="text-xs">Integra tu RAG con la API para ver actividad aquí</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentQueries.map((q) => (
                      <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className={`w-2 h-2 rounded-full ${q.status === 'success' ? 'bg-success' : 'bg-destructive'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{q.query}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {q.latency_ms}ms
                            </span>
                            <span>{format(new Date(q.created_at), 'dd MMM HH:mm', { locale: es })}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={q.status === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                          {q.status === 'success' ? 'OK' : 'Error'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Acceso rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo proyecto
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/analytics')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard Analytics
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/docs')}>
                <FileText className="h-4 w-4 mr-2" />
                Documentación API
              </Button>
              {projects.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/project/${projects[0].id}`)}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Último proyecto
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold">Mis Proyectos</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 w-48 bg-background border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Crear nuevo proyecto</DialogTitle>
                    <DialogDescription>
                      Un proyecto RAG te permite subir documentos y consultarlos via API.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del proyecto</Label>
                      <Input
                        id="name"
                        placeholder="Mi base de conocimiento"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción (opcional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe el propósito de este proyecto..."
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateProject} disabled={isSubmitting} className="gradient-primary">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Crear proyecto
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {loadingProjects ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No se encontraron proyectos' : 'Aún no tienes proyectos'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {searchQuery ? 'Intenta con otra búsqueda' : 'Crea tu primer proyecto para comenzar a indexar documentos'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateOpen(true)} className="gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear mi primer proyecto
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onNavigate={() => navigate(`/project/${project.id}`)}
                  onEdit={() => {
                    setEditingProject(project);
                    setIsEditOpen(true);
                  }}
                  onDelete={() => handleDeleteProject(project)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre del proyecto</Label>
              <Input
                id="edit-name"
                value={editingProject?.name || ''}
                onChange={(e) => setEditingProject(editingProject ? { ...editingProject, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={editingProject?.description || ''}
                onChange={(e) => setEditingProject(editingProject ? { ...editingProject, description: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditProject} disabled={isSubmitting} className="gradient-primary">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  accent,
}: {
  icon: any;
  label: string;
  value: number | string;
  trend?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-5 card-interactive ${accent ? 'bg-primary/5 border border-primary/20' : 'bg-card border border-border'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {trend && <p className="text-xs text-primary font-medium">{trend}</p>}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  index,
  onNavigate,
  onEdit,
  onDelete,
}: {
  project: Project;
  index: number;
  onNavigate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group bg-card border border-border rounded-xl p-5 card-interactive cursor-pointer opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onNavigate}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center p-2">
          <img src={logo} alt="" className="w-full h-full object-contain" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
        {project.name}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
        {project.description || 'Sin descripción'}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          <span>{project.document_count} docs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{project.chunk_count} chunks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Key className="h-3.5 w-3.5" />
          <span>{project.api_key_count} keys</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{project.query_count} queries</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(project.created_at), 'd MMM yyyy', { locale: es })}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Abrir</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
