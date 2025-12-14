import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Code, Copy, Check, Terminal, FileJson } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApiDocumentationProps {
  projectId: string;
}

export function ApiDocumentation({ projectId }: ApiDocumentationProps) {
  const [copiedExample, setCopiedExample] = useState<string | null>(null);

  const baseUrl = `https://ingyimnrogaxulfvlubg.supabase.co/functions/v1/api-query`;

  const handleCopy = async (code: string, exampleName: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedExample(exampleName);
    toast.success('Código copiado');
    setTimeout(() => setCopiedExample(null), 2000);
  };

  const curlExample = `curl -X POST '${baseUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: TU_API_KEY' \\
  -d '{
    "project_id": "${projectId}",
    "query": "¿Cuál es el horario de atención?"
  }'`;

  const jsExample = `const response = await fetch('${baseUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'TU_API_KEY'
  },
  body: JSON.stringify({
    project_id: '${projectId}',
    query: '¿Cuál es el horario de atención?'
  })
});

const data = await response.json();
console.log(data.response);`;

  const pythonExample = `import requests

response = requests.post(
    '${baseUrl}',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'TU_API_KEY'
    },
    json={
        'project_id': '${projectId}',
        'query': '¿Cuál es el horario de atención?'
    }
)

data = response.json()
print(data['response'])`;

  const phpExample = `<?php
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => '${baseUrl}',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: TU_API_KEY'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'project_id' => '${projectId}',
        'query' => '¿Cuál es el horario de atención?'
    ])
]);

$response = curl_exec($curl);
$data = json_decode($response, true);
echo $data['response'];
?>`;

  const responseExample = `{
  "response": "El horario de atención es de lunes a viernes de 9:00 a 18:00.",
  "metadata": {
    "project_id": "${projectId}",
    "model": "google/gemini-2.5-flash",
    "latency_ms": 1234,
    "chunks_used": 3,
    "examples_used": 2,
    "usage": {
      "prompt_tokens": 500,
      "completion_tokens": 50,
      "total_tokens": 550
    }
  }
}`;

  const CopyButton = ({ code, name }: { code: string; name: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="absolute top-2 right-2"
      onClick={() => handleCopy(code, name)}
    >
      {copiedExample === name ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5 text-primary" />
          Documentación de la API
        </CardTitle>
        <CardDescription>
          Usa estos ejemplos para integrar tu asistente RAG en tus aplicaciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Endpoint info */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Endpoint</h4>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">POST</span>
              <code className="text-sm font-mono break-all">{baseUrl}</code>
            </div>
          </div>
        </div>

        {/* Headers */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Headers requeridos</h4>
          <div className="p-3 bg-muted rounded-lg text-sm font-mono space-y-1">
            <p><span className="text-primary">Content-Type:</span> application/json</p>
            <p><span className="text-primary">x-api-key:</span> TU_API_KEY</p>
          </div>
        </div>

        {/* Request body */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Body de la petición
          </h4>
          <div className="p-3 bg-muted rounded-lg text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Parámetro</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Requerido</th>
                  <th className="pb-2 font-medium">Descripción</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 font-mono text-foreground">project_id</td>
                  <td className="py-2">string</td>
                  <td className="py-2">Sí</td>
                  <td className="py-2">ID de tu proyecto</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 font-mono text-foreground">query</td>
                  <td className="py-2">string</td>
                  <td className="py-2">Sí*</td>
                  <td className="py-2">Pregunta del usuario</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono text-foreground">messages</td>
                  <td className="py-2">array</td>
                  <td className="py-2">Sí*</td>
                  <td className="py-2">Historial de conversación (alternativa a query)</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs mt-2 text-muted-foreground">* Usa query para preguntas simples o messages para conversaciones con historial.</p>
          </div>
        </div>

        {/* Code examples */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Ejemplos de código
          </h4>
          
          <Tabs defaultValue="curl" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
            </TabsList>
            
            <TabsContent value="curl">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
                  {curlExample}
                </pre>
                <CopyButton code={curlExample} name="curl" />
              </div>
            </TabsContent>
            
            <TabsContent value="js">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
                  {jsExample}
                </pre>
                <CopyButton code={jsExample} name="js" />
              </div>
            </TabsContent>
            
            <TabsContent value="python">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
                  {pythonExample}
                </pre>
                <CopyButton code={pythonExample} name="python" />
              </div>
            </TabsContent>
            
            <TabsContent value="php">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
                  {phpExample}
                </pre>
                <CopyButton code={phpExample} name="php" />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Response example */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Respuesta</h4>
          <div className="relative">
            <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
              {responseExample}
            </pre>
            <CopyButton code={responseExample} name="response" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
