import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Key, Plus, Trash2, Copy, Check, Loader2, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface ApiKeysManagerProps {
  projectId: string;
}

// Simple hash function for API key validation
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a random API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'rag_';
  let key = '';
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + key;
}

export function ApiKeysManager({ projectId }: ApiKeysManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [keyStats, setKeyStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchApiKeys();
  }, [projectId]);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('project_api_keys')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: logsData, error: logsError } = await supabase
        .from('api_query_logs')
        .select('api_key_id')
        .eq('project_id', projectId)
        .gte('created_at', weekAgo)
        .not('api_key_id', 'is', null);
        
      if (!logsError && logsData) {
        const counts: Record<string, number> = {};
        // Use any here to avoid TS errors before types are regenerated
        logsData.forEach((log: any) => {
          if (log.api_key_id) {
            counts[log.api_key_id] = (counts[log.api_key_id] || 0) + 1;
          }
        });
        setKeyStats(counts);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Ingresa un nombre para la API key');
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const rawKey = generateApiKey();
      const keyHash = await hashApiKey(rawKey);
      const keyPrefix = rawKey.slice(-8);

      const { data, error } = await supabase
        .from('project_api_keys')
        .insert({
          project_id: projectId,
          user_id: user.id,
          api_key_hash: keyHash,
          key_prefix: keyPrefix,
          name: newKeyName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys([data, ...apiKeys]);
      setNewlyCreatedKey(rawKey);
      setNewKeyName('');
      setShowNewKey(true);
      toast.success('API Key creada correctamente');
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Error al crear la API key');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = async () => {
    if (!newlyCreatedKey) return;
    
    await navigator.clipboard.writeText(newlyCreatedKey);
    setCopied(true);
    toast.success('API Key copiada al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('¿Eliminar esta API key? Las aplicaciones que la usen dejarán de funcionar.')) return;

    try {
      await supabase.from('project_api_keys').delete().eq('id', id);
      setApiKeys(apiKeys.filter(k => k.id !== id));
      toast.success('API Key eliminada');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleToggleKey = async (id: string, isActive: boolean) => {
    try {
      await supabase
        .from('project_api_keys')
        .update({ is_active: isActive })
        .eq('id', id);

      setApiKeys(apiKeys.map(k => 
        k.id === id ? { ...k, is_active: isActive } : k
      ));
      toast.success(isActive ? 'API Key activada' : 'API Key desactivada');
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          API Keys
        </CardTitle>
        <CardDescription>
          Genera API keys para integrar tu asistente RAG en aplicaciones externas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create new key */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Nombre de la API key (ej: Producción, Desarrollo)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
            />
          </div>
          <Button onClick={handleCreateKey} disabled={creating}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generar
          </Button>
        </div>

        {/* Newly created key warning */}
        {newlyCreatedKey && (
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Key className="h-4 w-4" />
              <span className="font-medium text-sm">¡API Key creada!</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Copia esta key ahora. Por seguridad, no podrás verla de nuevo.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-background rounded text-xs font-mono break-all">
                {showNewKey ? newlyCreatedKey : '•'.repeat(44)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewKey(!showNewKey)}
              >
                {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyKey}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setNewlyCreatedKey(null)}
            >
              Entendido, ya la copié
            </Button>
          </div>
        )}

        {/* Keys list */}
        {apiKeys.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay API keys aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  key.is_active
                    ? 'bg-card border-border'
                    : 'bg-muted/20 border-border/50 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{key.name}</span>
                    <Badge variant={key.is_active ? 'default' : 'secondary'} className="text-xs">
                      {key.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-mono">rag_...{key.key_prefix}</span>
                    <span>Último uso: {formatDate(key.last_used_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <span className="flex items-center gap-1 font-medium text-primary">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary/70"></span>
                      {keyStats[key.id] || 0} llamadas esta semana
                    </span>
                    <span className="text-muted-foreground opacity-70">(límite 100/min)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleKey(key.id, !key.is_active)}
                  >
                    {key.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
