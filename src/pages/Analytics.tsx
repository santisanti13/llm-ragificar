import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Search, Activity, Clock, Zap, TrendingUp, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoWhite from "@/assets/logo-white.png";

interface QueryLog {
  id: string;
  project_id: string;
  query: string;
  response_preview: string | null;
  tokens_used: number;
  latency_ms: number;
  status: string;
  error_message: string | null;
  created_at: string;
  projects?: { name: string };
}

interface Project {
  id: string;
  name: string;
}

const Analytics = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calculate date filter
      const now = new Date();
      let startDate = new Date();
      switch (dateRange) {
        case "24h": startDate.setDate(now.getDate() - 1); break;
        case "7d": startDate.setDate(now.getDate() - 7); break;
        case "30d": startDate.setDate(now.getDate() - 30); break;
        case "90d": startDate.setDate(now.getDate() - 90); break;
        default: startDate.setDate(now.getDate() - 7);
      }

      const [logsRes, projectsRes] = await Promise.all([
        supabase
          .from("api_query_logs")
          .select("*, projects(name)")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("projects").select("id, name")
      ]);

      if (logsRes.error) throw logsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setLogs(logsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Error al cargar los datos de analytics");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = searchQuery === "" || 
        log.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject = selectedProject === "all" || log.project_id === selectedProject;
      const matchesStatus = selectedStatus === "all" || log.status === selectedStatus;
      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [logs, searchQuery, selectedProject, selectedStatus]);

  const stats = useMemo(() => {
    const totalQueries = filteredLogs.length;
    const successQueries = filteredLogs.filter(l => l.status === "success").length;
    const avgLatency = totalQueries > 0 
      ? Math.round(filteredLogs.reduce((acc, l) => acc + l.latency_ms, 0) / totalQueries) 
      : 0;
    const totalTokens = filteredLogs.reduce((acc, l) => acc + (l.tokens_used || 0), 0);
    const successRate = totalQueries > 0 ? Math.round((successQueries / totalQueries) * 100) : 0;
    
    return { totalQueries, avgLatency, totalTokens, successRate };
  }, [filteredLogs]);

  const exportToCSV = () => {
    const headers = ["Fecha", "Proyecto", "Query", "Estado", "Latencia (ms)", "Tokens", "Error"];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.projects?.name || "N/A",
      `"${log.query.replace(/"/g, '""')}"`,
      log.status,
      log.latency_ms.toString(),
      (log.tokens_used || 0).toString(),
      log.error_message ? `"${log.error_message.replace(/"/g, '""')}"` : ""
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ragify-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("CSV exportado correctamente");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <img src={logoWhite} alt="RAGify" className="h-12" />
          <div className="w-24" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics & Métricas</h1>
          <p className="text-muted-foreground">Monitorea el uso de tu API y analiza el rendimiento</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Queries</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalQueries.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Latencia Promedio</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.avgLatency} ms</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Usados</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalTokens.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Éxito</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.successRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por query o proyecto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[180px] bg-background border-border">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px] bg-background border-border">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Éxito</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px] bg-background border-border">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 días</SelectItem>
                  <SelectItem value="30d">Últimos 30 días</SelectItem>
                  <SelectItem value="90d">Últimos 90 días</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={exportToCSV} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Query History Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Historial de Queries</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay queries registradas en este período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Fecha</TableHead>
                      <TableHead className="text-muted-foreground">Proyecto</TableHead>
                      <TableHead className="text-muted-foreground">Query</TableHead>
                      <TableHead className="text-muted-foreground">Estado</TableHead>
                      <TableHead className="text-muted-foreground text-right">Latencia</TableHead>
                      <TableHead className="text-muted-foreground text-right">Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="border-border">
                        <TableCell className="text-foreground text-sm">
                          {format(new Date(log.created_at), "dd MMM HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell className="text-foreground">
                          <Badge variant="outline" className="border-border">
                            {log.projects?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground max-w-[300px] truncate">
                          {log.query}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={log.status === "success" ? "default" : "destructive"}
                            className={log.status === "success" ? "bg-primary/20 text-primary border-primary/30" : ""}
                          >
                            {log.status === "success" ? "Éxito" : "Error"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground text-right font-mono">
                          {log.latency_ms} ms
                        </TableCell>
                        <TableCell className="text-foreground text-right font-mono">
                          {(log.tokens_used || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Analytics;
