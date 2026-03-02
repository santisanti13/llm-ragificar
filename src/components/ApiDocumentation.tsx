import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Code, Copy, Check, Terminal, FileJson, Webhook, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApiDocumentationProps {
  projectId: string;
}

export function ApiDocumentation({ projectId }: ApiDocumentationProps) {
  const [copiedExample, setCopiedExample] = useState<string | null>(null);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-query`;

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

  const webhookExample = `// Ejemplo: Conectar a un webhook (n8n, Make, Zapier)
// Tu webhook puede enviar una pregunta y recibir la respuesta RAG

// URL del webhook de destino (ej: n8n)
const WEBHOOK_URL = 'https://tu-n8n.com/webhook/mi-rag';

// Cuando recibes un mensaje entrante:
async function handleIncomingMessage(userMessage) {
  // 1. Consulta tu RAG
  const ragResponse = await fetch('${baseUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'TU_API_KEY'
    },
    body: JSON.stringify({
      project_id: '${projectId}',
      query: userMessage
    })
  });
  
  const data = await ragResponse.json();
  
  // 2. Envía la respuesta a tu webhook o canal
  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answer: data.response,
      metadata: data.metadata
    })
  });
  
  return data.response;
}`;

  const lovableExample = `// Integrar RAG en OTRO proyecto de Lovable
// En tu edge function de otro proyecto:

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { question } = await req.json();

  // Llama a tu RAG API desde cualquier proyecto
  const response = await fetch('${baseUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('RAGIFY_API_KEY') // Tu API key de RAGify
    },
    body: JSON.stringify({
      project_id: '${projectId}',
      query: question
    })
  });

  const data = await response.json();
  
  return new Response(JSON.stringify({ 
    answer: data.response,
    sources: data.metadata?.chunks_used 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// En el frontend del otro proyecto:
// const { data } = await supabase.functions.invoke('mi-rag-proxy', {
//   body: { question: 'Mi pregunta' }
// });`;

  const conversationExample = `// Conversación con historial (múltiples turnos)
const messages = [
  { role: "user", content: "¿Qué servicios ofrecen?" },
  { role: "assistant", content: "Ofrecemos servicios de..." },
  { role: "user", content: "¿Y cuánto cuesta el plan básico?" }
];

const response = await fetch('${baseUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'TU_API_KEY'
  },
  body: JSON.stringify({
    project_id: '${projectId}',
    messages: messages
  })
});`;

  const responseExample = `{
  "response": "El horario de atención es de lunes a viernes...",
  "metadata": {
    "project_id": "${projectId}",
    "model": "google/gemini-2.5-flash",
    "latency_ms": 1234,
    "chunks_used": 5,
    "examples_used": 2,
    "semantic_search": true,
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
        <Check className="h-4 w-4 text-success" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            Documentación de la API
          </CardTitle>
          <CardDescription>
            Integra tu asistente RAG en cualquier aplicación, webhook o proyecto.
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
                    <td className="py-2">Historial de conversación</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs mt-2 text-muted-foreground">* Usa query para preguntas simples o messages para conversaciones.</p>
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
                <TabsTrigger value="conversation">Multi-turno</TabsTrigger>
              </TabsList>

              {[
                { key: 'curl', code: curlExample },
                { key: 'js', code: jsExample },
                { key: 'python', code: pythonExample },
                { key: 'conversation', code: conversationExample },
              ].map(({ key, code }) => (
                <TabsContent key={key} value={key}>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">{code}</pre>
                    <CopyButton code={code} name={key} />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Response example */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Respuesta</h4>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">{responseExample}</pre>
              <CopyButton code={responseExample} name="response" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration examples */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Integraciones
          </CardTitle>
          <CardDescription>
            Conecta tu RAG con webhooks, otros proyectos Lovable, o cualquier servicio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="webhook" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="webhook" className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhook
              </TabsTrigger>
              <TabsTrigger value="lovable" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Otro proyecto
              </TabsTrigger>
            </TabsList>

            <TabsContent value="webhook">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">{webhookExample}</pre>
                <CopyButton code={webhookExample} name="webhook" />
              </div>
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h5 className="font-medium text-sm mb-2">💡 Servicios compatibles</h5>
                <p className="text-xs text-muted-foreground">
                  n8n, Make (Integromat), Zapier, Power Automate, cualquier servicio que soporte HTTP webhooks.
                  Simplemente haz un POST a la URL de la API con tu API key.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="lovable">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">{lovableExample}</pre>
                <CopyButton code={lovableExample} name="lovable" />
              </div>
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h5 className="font-medium text-sm mb-2">💡 Cómo conectar desde otro proyecto Lovable</h5>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Crea una edge function proxy en tu otro proyecto</li>
                  <li>Guarda tu API key de RAGify como un secret (RAGIFY_API_KEY)</li>
                  <li>Llama a la API de RAGify desde tu edge function</li>
                  <li>Usa la respuesta en tu aplicación</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
