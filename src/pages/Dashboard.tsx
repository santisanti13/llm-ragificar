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
import { Plus, FolderOpen, Loader2, LogOut, Brain, Search, Calendar, FileText, MoreVertical, Pencil, Trash2, Sparkles, MessageSquare, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  document_count?: number;
  chunk_count?: number;
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const projectsWithCounts = await Promise.all(
        (projectsData || []).map(async (project) => {
          const [docsRes, chunksRes] = await Promise.all([
            supabase.from('documents').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
            supabase.from('document_chunks').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
          ]);
          return { 
            ...project, 
            document_count: docsRes.count || 0,
            chunk_count: chunksRes.count || 0
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none opacity-50" />
      
      {/* Header */}
      <header className="relative border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">RAGify</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={FolderOpen} label="Proyectos" value={projects.length} color="primary" />
          <StatCard icon={FileText} label="Documentos" value={totalDocuments} color="accent" />
          <StatCard icon={Sparkles} label="Chunks" value={totalChunks} color="warning" />
          <StatCard icon={MessageSquare} label="Consultas" value="-" color="success" />
        </div>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold">Mis Proyectos</h2>
            <p className="text-muted-foreground mt-1">Gestiona tus bases de conocimiento RAG</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proyecto
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader>
                <DialogTitle>Crear nuevo proyecto</DialogTitle>
                <DialogDescription>
                  Un proyecto RAG te permite subir documentos y chatear con tu contenido.
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
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe el propósito de este proyecto..."
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="bg-background/50"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateProject} disabled={isSubmitting} className="gradient-primary">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Crear proyecto
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proyectos..."
            className="pl-11 max-w-md bg-card/50 border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Projects grid */}
        {loadingProjects ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="glass-strong">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <FolderOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? 'No se encontraron proyectos' : 'No tienes proyectos aún'}
              </h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                {searchQuery
                  ? 'Intenta con otra búsqueda'
                  : 'Crea tu primer proyecto para comenzar a usar RAGify'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateOpen(true)} className="gradient-primary shadow-lg shadow-primary/25">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear mi primer proyecto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => (
              <Card
                key={project.id}
                className="glass group hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer hover:-translate-y-1 opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mb-2 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                      <Brain className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(project);
                            setIsEditOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                    {project.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {project.description || 'Sin descripción'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      <span>{project.document_count} docs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      <span>{project.chunk_count} chunks</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(project.created_at), "d 'de' MMM, yyyy", { locale: es })}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="glass-strong">
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
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={editingProject?.description || ''}
                onChange={(e) => setEditingProject(editingProject ? { ...editingProject, description: e.target.value } : null)}
                className="bg-background/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditProject} disabled={isSubmitting} className="gradient-primary">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  const colorClasses = {
    primary: 'from-violet-500 to-purple-600',
    accent: 'from-emerald-500 to-teal-600',
    warning: 'from-amber-500 to-orange-600',
    success: 'from-green-500 to-emerald-600',
  };

  return (
    <Card className="glass overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}