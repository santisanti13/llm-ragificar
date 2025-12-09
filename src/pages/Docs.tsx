import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Check, Terminal, Code, Zap, BookOpen, Key, MessageSquare, Settings, ChevronRight } from 'lucide-react';
import logo from '@/assets/logo.png';
import logoWhite from '@/assets/logo-white.png';

const API_BASE_URL = "https://ingyimnrogaxulfvlubg.supabase.co/functions/v1";

export default function Docs() {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const curlExample = `curl -X POST "${API_BASE_URL}/api-query" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "project_id": "YOUR_PROJECT_ID",
    "query": "¿Cuál es la política de devoluciones?"
  }'`;

  const pythonExample = `import requests

API_KEY = "YOUR_API_KEY"
PROJECT_ID = "YOUR_PROJECT_ID"

response = requests.post(
    "${API_BASE_URL}/api-query",
    headers={
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    },
    json={
        "project_id": PROJECT_ID,
        "query": "¿Cuál es la política de devoluciones?"
    }
)

data = response.json()
print(data["response"])

# Metadata disponible
print(f"Latencia: {data['metadata']['latency_ms']}ms")
print(f"Chunks usados: {data['metadata']['chunks_used']}")`;

  const javascriptExample = `const API_KEY = "YOUR_API_KEY";
const PROJECT_ID = "YOUR_PROJECT_ID";

const response = await fetch("${API_BASE_URL}/api-query", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
  },
  body: JSON.stringify({
    project_id: PROJECT_ID,
    query: "¿Cuál es la política de devoluciones?"
  })
});

const data = await response.json();
console.log(data.response);

// Metadata disponible
console.log(\`Latencia: \${data.metadata.latency_ms}ms\`);
console.log(\`Chunks usados: \${data.metadata.chunks_used}\`);`;

  const phpExample = `<?php

$apiKey = "YOUR_API_KEY";
$projectId = "YOUR_PROJECT_ID";

$ch = curl_init("${API_BASE_URL}/api-query");

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "x-api-key: " . $apiKey
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "project_id" => $projectId,
        "query" => "¿Cuál es la política de devoluciones?"
    ])
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
echo $data["response"];

// Metadata disponible
echo "Latencia: " . $data["metadata"]["latency_ms"] . "ms\\n";
echo "Chunks usados: " . $data["metadata"]["chunks_used"] . "\\n";
?>`;

  const conversationExample = `// Ejemplo de conversación multi-turno
const messages = [
  { role: "user", content: "¿Qué productos tienen disponibles?" },
  { role: "assistant", content: "Tenemos laptops, tablets y accesorios..." },
  { role: "user", content: "¿Cuánto cuesta la laptop más barata?" }
];

const response = await fetch("${API_BASE_URL}/api-query", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
  },
  body: JSON.stringify({
    project_id: PROJECT_ID,
    messages: messages  // Usar 'messages' en lugar de 'query'
  })
});`;

  const responseExample = `{
  "response": "Nuestra política de devoluciones permite...",
  "metadata": {
    "project_id": "abc123-def456-...",
    "model": "google/gemini-2.5-flash",
    "latency_ms": 1234,
    "chunks_used": 5,
    "examples_used": 3,
    "usage": {
      "prompt_tokens": 1500,
      "completion_tokens": 200,
      "total_tokens": 1700
    }
  }
}`;

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedCode === id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div className="h-6 w-px bg-border" />
            <img src={logo} alt="RAGify" className="h-24 w-auto -my-6 dark:hidden" />
            <img src={logoWhite} alt="RAGify" className="h-24 w-auto -my-6 hidden dark:block" />
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
            <BookOpen className="h-3 w-3 mr-1" />
            Documentación API
          </Badge>
        </div>
      </nav>

      <main className="container mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-12">
          <h1 className="text-4xl font-bold mb-4">Documentación de la API</h1>
          <p className="text-lg text-muted-foreground">
            Integra RAGify en tu aplicación usando nuestra API REST simple y potente.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Quick Start */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Inicio rápido
              </CardTitle>
              <CardDescription>
                Todo lo que necesitas para empezar a usar la API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</div>
                    <span className="font-medium">Crea un proyecto</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Sube documentos y entrena tu RAG</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</div>
                    <span className="font-medium">Obtén tu API Key</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Copia el Project ID de tu proyecto</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</div>
                    <span className="font-medium">Haz tu primera query</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Usa cualquiera de los ejemplos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endpoint */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Endpoint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border font-mono text-sm">
                <Badge className="bg-green-500/20 text-green-500 border-0">POST</Badge>
                <span className="text-muted-foreground">{API_BASE_URL}/api-query</span>
              </div>
            </CardContent>
          </Card>

          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Autenticación
              </CardTitle>
              <CardDescription>
                Incluye tu API key en cada petición
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Puedes autenticarte de dos formas:
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg border border-border">
                  <p className="font-mono text-sm mb-1">x-api-key: YOUR_API_KEY</p>
                  <p className="text-xs text-muted-foreground">Header personalizado (recomendado)</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border border-border">
                  <p className="font-mono text-sm mb-1">Authorization: Bearer YOUR_API_KEY</p>
                  <p className="text-xs text-muted-foreground">Header estándar Bearer</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Parámetros de la petición
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium">Parámetro</th>
                      <th className="text-left py-3 px-2 font-medium">Tipo</th>
                      <th className="text-left py-3 px-2 font-medium">Requerido</th>
                      <th className="text-left py-3 px-2 font-medium">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-3 px-2 font-mono text-primary">project_id</td>
                      <td className="py-3 px-2 text-muted-foreground">string</td>
                      <td className="py-3 px-2"><Badge variant="destructive" className="text-xs">Sí</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">UUID del proyecto RAG</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2 font-mono text-primary">query</td>
                      <td className="py-3 px-2 text-muted-foreground">string</td>
                      <td className="py-3 px-2"><Badge variant="secondary" className="text-xs">Condicional</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">Pregunta simple (usar si no se envía messages)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2 font-mono text-primary">messages</td>
                      <td className="py-3 px-2 text-muted-foreground">array</td>
                      <td className="py-3 px-2"><Badge variant="secondary" className="text-xs">Condicional</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">Array de mensajes para conversaciones multi-turno</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2 font-mono text-primary">stream</td>
                      <td className="py-3 px-2 text-muted-foreground">boolean</td>
                      <td className="py-3 px-2"><Badge variant="outline" className="text-xs">No</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">Habilitar streaming (próximamente)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Code Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Ejemplos de código
              </CardTitle>
              <CardDescription>
                Copia y pega estos ejemplos para empezar rápidamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="curl" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="php">PHP</TabsTrigger>
                </TabsList>
                <TabsContent value="curl">
                  <CodeBlock code={curlExample} language="bash" id="curl" />
                </TabsContent>
                <TabsContent value="python">
                  <CodeBlock code={pythonExample} language="python" id="python" />
                </TabsContent>
                <TabsContent value="javascript">
                  <CodeBlock code={javascriptExample} language="javascript" id="javascript" />
                </TabsContent>
                <TabsContent value="php">
                  <CodeBlock code={phpExample} language="php" id="php" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Multi-turn Conversations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Conversaciones multi-turno
              </CardTitle>
              <CardDescription>
                Mantén el contexto de la conversación enviando el historial de mensajes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={conversationExample} language="javascript" id="conversation" />
              <p className="text-sm text-muted-foreground mt-4">
                Cada mensaje debe tener un <code className="text-primary">role</code> ("user" o "assistant") 
                y un <code className="text-primary">content</code> con el texto del mensaje.
              </p>
            </CardContent>
          </Card>

          {/* Response Format */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-primary" />
                Formato de respuesta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={responseExample} language="json" id="response" />
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Campos de metadata:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><code className="text-primary">latency_ms</code> - Tiempo de respuesta en milisegundos</li>
                  <li><code className="text-primary">chunks_used</code> - Número de fragmentos de documento usados</li>
                  <li><code className="text-primary">examples_used</code> - Número de ejemplos de entrenamiento aplicados</li>
                  <li><code className="text-primary">usage</code> - Tokens consumidos (prompt, completion, total)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Error Codes */}
          <Card>
            <CardHeader>
              <CardTitle>Códigos de error</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium">Código</th>
                      <th className="text-left py-3 px-2 font-medium">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-3 px-2"><Badge variant="destructive">400</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">Parámetros inválidos o faltantes</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2"><Badge variant="destructive">401</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">API key no proporcionada o inválida</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2"><Badge variant="destructive">402</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">Créditos agotados</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2"><Badge variant="destructive">404</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">Proyecto no encontrado</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2"><Badge variant="destructive">429</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">Límite de peticiones excedido</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2"><Badge variant="destructive">500</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">Error interno del servidor</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold mb-3">¿Listo para empezar?</h3>
            <p className="text-muted-foreground mb-6">
              Crea tu primer proyecto RAG y obtén tu API key en minutos
            </p>
            <Button size="lg" className="gradient-primary" onClick={() => navigate('/auth')}>
              Crear proyecto gratis
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
