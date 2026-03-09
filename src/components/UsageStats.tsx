import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Database, 
  FileText, 
  Crown,
  TrendingUp,
  Loader2
} from 'lucide-react';

interface UsageData {
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  limits: {
    projects: number;
    queries_per_month: number;
    max_file_size_mb: number;
  };
  usage: {
    projects: number;
    queries_this_month: number;
    storage_mb: number;
  };
}

export function UsageStats() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_usage_stats', {
        user_uuid: user.id
      });

      if (error) throw error;
      setUsageData(data as UsageData);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-muted text-muted-foreground border-border';
      case 'starter': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      case 'pro': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
      case 'enterprise': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'free': return 'Gratis';
      case 'starter': return 'Starter';
      case 'pro': return 'Pro';
      case 'enterprise': return 'Enterprise';
      default: return 'Gratis';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const calculatePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const formatLimit = (limit: number, unit: string = '') => {
    if (limit === -1) return 'Ilimitado';
    return `${limit.toLocaleString()}${unit}`;
  };

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!usageData) return null;

  const { tier, limits, usage } = usageData;
  const projectsPercentage = calculatePercentage(usage.projects, limits.projects);
  const queriesPercentage = calculatePercentage(usage.queries_this_month, limits.queries_per_month);

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Uso del Plan
            </CardTitle>
            <CardDescription>
              Tu consumo actual y límites disponibles
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getTierColor(tier)}>
              <Crown className="h-3 w-3 mr-1" />
              {getTierName(tier)}
            </Badge>
            {tier === 'free' && (
              <Button size="sm" className="ml-2">
                <TrendingUp className="h-4 w-4 mr-1" />
                Mejorar Plan
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Proyectos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Proyectos</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage.projects} / {formatLimit(limits.projects)}
            </span>
          </div>
          {limits.projects !== -1 && (
            <div className="space-y-1">
              <Progress 
                value={projectsPercentage}
                className="h-2"
              />
              {projectsPercentage >= 90 && (
                <p className="text-xs text-red-600">
                  ⚠️ Te estás acercando al límite de proyectos
                </p>
              )}
            </div>
          )}
        </div>

        {/* Queries mensuales */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Queries este mes</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage.queries_this_month.toLocaleString()} / {formatLimit(limits.queries_per_month)}
            </span>
          </div>
          {limits.queries_per_month !== -1 && (
            <div className="space-y-1">
              <Progress 
                value={queriesPercentage}
                className="h-2"
              />
              {queriesPercentage >= 90 && (
                <p className="text-xs text-destructive">
                  ⚠️ Te estás acercando al límite mensual de queries
                </p>
              )}
            </div>
          )}
        </div>

        {/* Almacenamiento */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Almacenamiento</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage.storage_mb} MB / {formatLimit(limits.max_file_size_mb, ' MB')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Límite por archivo individual: {formatLimit(limits.max_file_size_mb, ' MB')}
          </p>
        </div>

        {/* Información adicional */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Plan actual: <strong>{getTierName(tier)}</strong>
            </span>
            {tier !== 'enterprise' && (
              <Button variant="outline" size="sm">
                <TrendingUp className="h-3 w-3 mr-1" />
                Mejorar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}