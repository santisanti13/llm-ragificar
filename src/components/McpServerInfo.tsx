import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Plug, Terminal, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  projectId: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function McpServerInfo({ projectId }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const endpoint = `${SUPABASE_URL}/functions/v1/mcp-server/${projectId}`;

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        ragify: {
          url: endpoint,
          headers: {
            Authorization: 'Bearer TU_API_KEY_DE_RAGIFY',
          },
        },
      },
    },
    null,
    2,
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        ragify: {
          url: endpoint,
          headers: {
            Authorization: 'Bearer TU_API_KEY_DE_RAGIFY',
          },
        },
      },
    },
    null,
    2,
  );

  const curlSnippet = `curl -X POST "${endpoint}" \\
  -H "Authorization: Bearer TU_API_KEY_DE_RAGIFY" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopied(null), 1500);
  };

  const CopyBtn = ({ value, k }: { value: string; k: string }) => (
    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copy(value, k)}>
      {copied === k ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5 text-primary" />
                Servidor MCP del proyecto
              </CardTitle>
              <CardDescription className="mt-1">
                Conecta este RAG como herramienta nativa en Claude Desktop, Cursor o
                cualquier cliente compatible con Model Context Protocol.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary">
              JSON-RPC 2.0
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Endpoint
            </label>
            <div className="flex items-center gap-2 mt-1 p-3 rounded-md bg-muted/40 border border-border font-mono text-sm">
              <span className="truncate flex-1">{endpoint}</span>
              <CopyBtn value={endpoint} k="endpoint" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-md border border-border bg-card/40">
              <p className="text-xs text-muted-foreground">Autenticación</p>
              <p className="text-sm font-medium mt-1">Bearer API Key</p>
            </div>
            <div className="p-3 rounded-md border border-border bg-card/40">
              <p className="text-xs text-muted-foreground">Transport</p>
              <p className="text-sm font-medium mt-1">Streamable HTTP</p>
            </div>
            <div className="p-3 rounded-md border border-border bg-card/40">
              <p className="text-xs text-muted-foreground">Herramientas</p>
              <p className="text-sm font-medium mt-1">3 disponibles</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Tools expuestas
            </p>
            <ul className="space-y-2 text-sm">
              <li className="p-3 rounded-md border border-border bg-card/40">
                <code className="text-primary font-mono">search_knowledge</code>
                <span className="text-muted-foreground"> — Búsqueda híbrida (FTS + vectorial) en los documentos.</span>
              </li>
              <li className="p-3 rounded-md border border-border bg-card/40">
                <code className="text-primary font-mono">ask</code>
                <span className="text-muted-foreground"> — Respuesta sintetizada con citas a partir del RAG.</span>
              </li>
              <li className="p-3 rounded-md border border-border bg-card/40">
                <code className="text-primary font-mono">list_documents</code>
                <span className="text-muted-foreground"> — Inventario de documentos del proyecto.</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Configuración del cliente
          </CardTitle>
          <CardDescription>
            Sustituye <code>TU_API_KEY_DE_RAGIFY</code> por una API key creada en la pestaña <strong>API</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="claude" className="space-y-3">
            <TabsList>
              <TabsTrigger value="claude">Claude Desktop</TabsTrigger>
              <TabsTrigger value="cursor">Cursor</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>

            <TabsContent value="claude" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Añádelo a <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS)
                o <code>%APPDATA%\Claude\claude_desktop_config.json</code> (Windows) y reinicia Claude.
              </p>
              <div className="relative">
                <pre className="p-4 rounded-md bg-muted/40 border border-border text-xs overflow-x-auto">
                  <code>{claudeConfig}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyBtn value={claudeConfig} k="claude" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="cursor" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                En Cursor: <strong>Settings → MCP → Add new MCP server</strong> y pega esta configuración.
              </p>
              <div className="relative">
                <pre className="p-4 rounded-md bg-muted/40 border border-border text-xs overflow-x-auto">
                  <code>{cursorConfig}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyBtn value={cursorConfig} k="cursor" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="curl" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Comprueba la conexión listando las herramientas disponibles.
              </p>
              <div className="relative">
                <pre className="p-4 rounded-md bg-muted/40 border border-border text-xs overflow-x-auto">
                  <code>{curlSnippet}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyBtn value={curlSnippet} k="curl" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
