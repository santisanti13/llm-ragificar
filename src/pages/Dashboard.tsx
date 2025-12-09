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
import { Plus, FolderOpen, Loader2, LogOut, Brain, Search, Calendar, FileText, MoreVertical, Pencil, Trash2, Sparkles, MessageSquare, ArrowRight, ChevronRight } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle background */}
      <div className="fixed inset-0 bg-dots opacity-50 pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">RAGify</span>
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

      <main className="relative container mx-auto px-6 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            Bienvenido de vuelta
          </h1>
          <p className="text-muted-foreground">Gestiona tus proyectos RAG y bases de conocimiento</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard 
            icon={FolderOpen} 
            label="Proyectos activos" 
            value={projects.length} 
            trend="+2 este mes"
          />
          <StatCard 
            icon={FileText} 
            label="Documentos" 
            value={totalDocuments}
            trend="Indexados"
          />
          <StatCard 
            icon={Sparkles} 
            label="Chunks vectoriales" 
            value={totalChunks}
            trend="Embeddings"
          />
          <StatCard 
            icon={MessageSquare} 
            label="Consultas API" 
            value="-"
            trend="Este periodo"
          />
        </div>

        {/* Section header with actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold">Mis Proyectos</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
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
        </div>

        {/* Projects grid */}
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
              {searchQuery
                ? 'Intenta con otra búsqueda'
                : 'Crea tu primer proyecto para comenzar a indexar documentos'}
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
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
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

// Stat Card Component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend 
}: { 
  icon: any; 
  label: string; 
  value: number | string; 
  trend: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 card-interactive">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
        {trend}
      </p>
    </div>
  );
}

// Project Card Component
function ProjectCard({ 
  project, 
  index,
  onNavigate,
  onEdit,
  onDelete
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
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Brain className="h-5 w-5" />
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
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title & Description */}
      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
        {project.name}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
        {project.description || 'Sin descripción'}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          <span>{project.document_count} docs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4" />
          <span>{project.chunk_count} chunks</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(project.created_at), "d MMM yyyy", { locale: es })}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Abrir</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
