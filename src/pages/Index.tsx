import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  ArrowRight, Loader2, Shield, Code, FileText, Bot, Terminal, Check,
  ChevronRight, Sparkles, Lock, Upload, Brain, Rocket, Plug, Network, Search,
  Menu, X, Play, Zap, Mail, Twitter, Github, Linkedin
} from 'lucide-react';
import logo from '@/assets/logo.png';
import logoWhite from '@/assets/logo-white.png';


export default function Index() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const navLinks = [
    { label: 'BENEFICIOS', href: '#benefits' },
    { label: 'CÓMO FUNCIONA', href: '#how-it-works' },
    { label: 'MCP', href: '#mcp' },
    { label: 'PRECIOS', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - TinyFish style: clean, monospaced */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="RAGify" className="h-24 md:h-28 w-auto -my-6 dark:hidden" />
            <img src={logoWhite} alt="RAGify" className="h-24 md:h-28 w-auto -my-6 hidden dark:block" />
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-mono tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth')}
              className="hidden sm:flex font-mono text-xs tracking-wider"
            >
              INGRESAR
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/auth')}
              className="gradient-primary font-mono text-xs tracking-wider px-5"
            >
              EMPEZAR GRATIS
            </Button>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobileMenuOpen} aria-controls="mobile-menu">
              {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </Button>

          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-menu" className="lg:hidden bg-background border-b border-border animate-fade-in">
            <div className="container mx-auto px-6 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-xs font-mono tracking-widest text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Button variant="outline" size="sm" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="w-full mt-2 font-mono text-xs tracking-wider">
                INGRESAR
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - TinyFish style: massive typography */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 relative">
        <div className="container mx-auto px-6">
          {/* Small badge */}
          <div className="mb-8">
            <span className="inline-block font-mono text-xs tracking-widest px-4 py-2 rounded-full border border-primary/40 text-primary bg-primary/5">
              RAG + MCP AS A SERVICE
            </span>
          </div>

          {/* Giant headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-semibold leading-[0.95] tracking-tight mb-8 font-display">
            Convierte tus documentos en una <span className="text-gradient italic">API inteligente</span> — y en un <span className="text-gradient italic">servidor MCP</span> listo para tus agentes.
          </h1>


          {/* Subtitle - monospaced */}
          <p className="font-mono text-sm md:text-base text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            RAGify ingiere tus PDFs, JSON, Markdown, HTML y CSV, los vectoriza y
            los expone como un endpoint REST de RAG y como un servidor MCP nativo.
            Tu conocimiento, accesible desde tu app, desde Claude, Cursor o cualquier agente — en minutos.
          </p>

          {/* CTA */}
          <Button
            size="lg"
            className="gradient-primary h-14 px-10 font-mono text-sm tracking-wider rounded-none hover:opacity-90 transition-opacity"
            onClick={() => navigate('/auth')}
          >
            EMPEZAR GRATIS →
          </Button>

          {/* Promo video */}
          <div className="mt-16 md:mt-20 relative rounded-lg overflow-hidden border border-border bg-card shadow-2xl">
            <video
              src={promoVideo.url}
              className="w-full h-auto block"
              controls
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Vídeo promocional de RAGify"
            />
          </div>
        </div>
      </section>

      {/* Marquee Ticker - TinyFish style */}
      <MarqueeTicker />

      {/* Stats Section - 3 columns with large numbers */}
      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-3 divide-x divide-border">
            <StatBlock value="3 min" label="TIEMPO DE SETUP" />
            <StatBlock value="99.9%" label="UPTIME GARANTIZADO" />
            <StatBlock value="<100ms" label="LATENCIA PROMEDIO" />
          </div>
        </div>
      </section>

      {/* Benefits Section - Numbered cards like TinyFish */}
      <section id="benefits" className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">Qué Incluye</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-16 max-w-2xl">
            Todo lo que necesitas para RAG en producción.
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            <BenefitCard
              number="01"
              title="Procesamiento de Documentos"
              description="PDFs, Word, Excel, imágenes con OCR, URLs. Procesamos, fragmentamos y vectorizamos automáticamente con embeddings de alta dimensión."
            />
            <BenefitCard
              number="02"
              title="Entrenamiento Sin Código"
              description="Define cómo responde tu asistente con system prompts y ejemplos Q&A. Controla tono, formato y precisión sin tocar un modelo."
            />
            <BenefitCard
              number="03"
              title="API REST en Minutos"
              description="Un solo endpoint con autenticación por API key. Ejemplos en cURL, Python, JavaScript y más. Integra con cualquier stack."
            />
            <BenefitCard
              number="04"
              title="Seguridad Empresarial"
              description="Documentos encriptados, aislados por proyecto. Tus datos nunca se comparten con terceros ni se usan para entrenar modelos."
            />
            <BenefitCard
              number="05"
              title="Analíticas en Tiempo Real"
              description="Monitorea consultas, latencia, uso de tokens y scores de confianza. Entiende cómo rinde tu base de conocimiento."
            />
            <BenefitCard
              number="06"
              title="Integraciones con Webhooks"
              description="Conecta con n8n, Zapier, Make y cualquier herramienta compatible con HTTP. Automatiza flujos con tu endpoint RAG."
            />
          </div>
        </div>
      </section>

      {/* Manifesto Section - Por qué RAGify */}
      <section className="py-24 md:py-32 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <p className="font-mono text-xs tracking-widest text-primary mb-4">MANIFIESTO</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-[0.95]">
              RAGify nació de una frustración real.
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-16 max-w-3xl leading-relaxed">
              Construir IA sobre tus propios datos no debería requerir un equipo de Machine Learning.{' '}
              <span className="text-foreground font-medium">Cualquiera puede hablar de IA. Pocos la hacen accesible.</span>
            </p>

            <div className="space-y-0 border-t border-border">
              {[
                {
                  number: '01',
                  title: 'Obsesión por la simplicidad',
                  description: 'Cada decisión de producto se filtra por una pregunta: "¿Un founder sin equipo técnico podría hacerlo solo?" Si la respuesta es no, se rediseña.',
                },
                {
                  number: '02',
                  title: 'Pensamiento API-first',
                  description: 'RAGify no es un chatbot bonito. Es infraestructura. Un endpoint REST que se integra con cualquier stack, cualquier lenguaje, cualquier herramienta no-code. La visión siempre fue: construye la tubería, no el grifo.',
                },
                {
                  number: '03',
                  title: 'Seguridad como principio',
                  description: 'Documentos encriptados AES-256, aislamiento por proyecto, verificación JWT en cada endpoint. No es un checkbox de marketing — es arquitectura.',
                },
                {
                  number: '04',
                  title: 'Full-stack por convicción',
                  description: 'Desde el procesamiento de documentos con OCR hasta analíticas en tiempo real, pasando por edge functions y embeddings vectoriales. RAGify es el producto de alguien que entiende cada capa del stack.',
                },
                {
                  number: '05',
                  title: 'Velocidad como ventaja',
                  description: 'Setup en 3 minutos. Latencia menor a 100ms. Deploy instantáneo. Porque en el mundo real, la velocidad de iteración gana a la perfección teórica.',
                },
              ].map((item) => (
                <div key={item.number} className="grid grid-cols-12 border-b border-border py-8 group">
                  <div className="col-span-1">
                    <span className="font-mono text-xs text-muted-foreground">{item.number}</span>
                  </div>
                  <div className="col-span-11 md:col-span-3">
                    <h3 className="text-lg md:text-xl font-bold group-hover:text-primary transition-colors">{item.title}</h3>
                  </div>
                  <div className="col-span-12 md:col-span-8 mt-3 md:mt-0 md:pl-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="font-mono text-xs tracking-widest text-muted-foreground mt-12 max-w-2xl leading-loose">
              RAG EN PRODUCCIÓN, SIN EL EQUIPO DE ML. — TU CONOCIMIENTO. TU API. TU CONTROL.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works - Timeline style */}
      <section id="how-it-works" className="py-24 md:py-32 border-t border-border">
        <div className="container mx-auto px-6">
          <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">Cómo Funciona</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-20 max-w-3xl">
            De cero a API.{' '}
            <span className="text-primary">3 pasos simples.</span>
          </h2>

          <div className="space-y-0 border-t border-border">
            <TimelineStep
              number="01"
              title="Sube"
              duration="2 min"
              description="Arrastra PDFs, imágenes, documentos Word o pega URLs. Extraemos, limpiamos y vectorizamos automáticamente."
              details={['PDFs, Word, imágenes con OCR', 'Scraping de URLs', 'Chunking semántico automático']}
            />
            <TimelineStep
              number="02"
              title="Entrena"
              duration="5 min"
              description="Define cómo debe responder tu asistente con system prompts personalizados y ejemplos Q&A."
              details={['System prompts personalizados', 'Ejemplos Q&A', 'Control de tono y estilo']}
            />
            <TimelineStep
              number="03"
              title="Despliega"
              duration="Instantáneo"
              description="Copia tu endpoint y API key. Haz tu primera consulta en segundos con cualquier lenguaje."
              details={['Endpoint API REST', 'Streaming opcional', 'Documentación completa']}
            />
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-24 md:py-32 border-t border-border bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="font-mono text-xs tracking-widest text-primary mb-4">INTEGRACIÓN</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Una llamada API.<br />Eso es todo.</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Sin SDKs complicados. Sin configuración de modelos. Solo un POST con tu pregunta y obtén la respuesta.
                </p>
                <div className="space-y-4">
                  {['Respuestas contextuales de tus documentos', 'Streaming opcional para UX fluida', 'Metadata de chunks en cada respuesta'].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="bg-card border border-border rounded-none overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive/60" />
                      <div className="w-3 h-3 rounded-full bg-warning/60" />
                      <div className="w-3 h-3 rounded-full bg-primary/60" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">api-request.js</span>
                  </div>
                  <pre className="p-6 text-sm overflow-x-auto">
                    <code className="text-muted-foreground font-mono">
{`const response = await fetch(
  'https://api.ragify.dev/v1/query',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      project_id: 'proj_abc123',
      query: '¿Cuál es la política de
              devoluciones?'
    })
  }
);

const data = await response.json();
console.log(data.answer);`}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MCP Section — Servidor MCP por proyecto */}
      <section id="mcp" className="py-24 md:py-32 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl">
            <p className="font-mono text-xs tracking-widest text-primary mb-4">MODEL CONTEXT PROTOCOL</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 leading-[0.95] font-display">
              Cada proyecto incluye un <span className="text-gradient italic">servidor MCP</span> nativo.
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mb-16 leading-relaxed">
              Conecta tu base de conocimiento directamente a Claude Desktop, Cursor, Windsurf o
              cualquier cliente compatible con MCP. Sin pegamento, sin proxys: un endpoint
              JSON-RPC 2.0 autenticado por API key, listo para que tus agentes razonen sobre tus datos.
            </p>

            <div className="grid md:grid-cols-3 gap-px bg-border mb-16">
              <McpToolCard
                icon={<Search className="h-5 w-5" />}
                name="search_knowledge"
                description="Búsqueda híbrida (semántica + full-text) sobre los chunks del proyecto. Devuelve fragmentos con score y metadatos."
              />
              <McpToolCard
                icon={<Brain className="h-5 w-5" />}
                name="ask"
                description="Respuesta sintetizada por el pipeline RAG con citas numeradas. Ideal para flujos conversacionales del agente."
              />
              <McpToolCard
                icon={<FileText className="h-5 w-5" />}
                name="list_documents"
                description="Inventario completo de documentos indexados: nombre, tipo, fecha y número de chunks vectorizados."
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">PARA QUÉ SIRVE</p>
                <ul className="space-y-4">
                  {[
                    { t: 'Claude / Cursor con tu conocimiento', d: 'Tu equipo escribe código o redacta en Claude y el agente consulta tus manuales, tickets o políticas en tiempo real.' },
                    { t: 'Agentes autónomos con memoria privada', d: 'Tu agente de soporte, ventas u operaciones razona sobre documentos internos sin exponerlos a terceros.' },
                    { t: 'Un único protocolo, cero integraciones', d: 'MCP es el estándar abierto que ya hablan los LLMs líderes. Activa una vez, úsalo desde cualquier cliente.' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.t}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card border border-border overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-primary/60" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">claude_desktop_config.json</span>
                </div>
                <pre className="p-6 text-xs overflow-x-auto">
                  <code className="text-muted-foreground font-mono">
{`{
  "mcpServers": {
    "ragify": {
      "url": "https://api.ragify.dev/mcp/{project_id}",
      "headers": {
        "Authorization": "Bearer rag_xxxxxxxxxxxx"
      }
    }
  }
}`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32 border-t border-border">

        <div className="container mx-auto px-6">
          <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">Precios</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 max-w-2xl">
            Empieza gratis. Escala cuando quieras.
          </h2>
          <p className="text-muted-foreground mb-16 max-w-xl">Sin sorpresas. Paga solo por lo que usas.</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            <PricingCard
              name="Free"
              price="$0"
              period="/mes"
              description="Para pruebas y proyectos personales"
              features={['1 proyecto', '50 consultas/mes', '25MB almacenamiento', 'Docs de API', 'Soporte comunidad']}
              onCtaClick={() => navigate('/auth')}
            />
            <PricingCard
              name="Starter"
              price="$15"
              period="/mes"
              description="Para proyectos en crecimiento"
              features={['3 proyectos', '1K consultas/mes', '200MB almacenamiento', 'Analíticas básicas', 'Soporte por email']}
              onCtaClick={() => navigate('/auth')}
            />
            <PricingCard
              name="Pro"
              price="$49"
              period="/mes"
              description="Para startups y equipos"
              features={['10 proyectos', '10K consultas/mes', '1GB almacenamiento', 'Analíticas avanzadas', 'Soporte prioritario', 'Webhooks']}
              highlighted
              onCtaClick={() => navigate('/auth')}
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              period=""
              description="Para grandes organizaciones"
              features={['Proyectos ilimitados', 'Consultas ilimitadas', 'Almacenamiento ilimitado', 'SSO / SAML', 'Soporte dedicado', 'SLA 99.99%']}
              onCtaClick={() => navigate('/auth')}
            />
          </div>
        </div>
      </section>

      {/* FAQ - Numbered like TinyFish */}
      <section id="faq" className="py-24 md:py-32 border-t border-border">
        <div className="container mx-auto px-6">
          <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">FAQ</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-16 max-w-2xl">
            Preguntas frecuentes, respuestas directas.
          </h2>

          <div className="max-w-3xl">
            <Accordion type="single" collapsible className="space-y-0 border-t border-border">
              {[
                { q: '¿Qué tipos de documentos puedo subir?', a: 'Soportamos PDF, TXT, Markdown (.md/.mdx), JSON/JSONL, CSV/TSV, HTML, XML, YAML, TOML, RST, RTF, logs y los formatos de código más comunes. Cada documento se procesa, fragmenta inteligentemente y vectoriza automáticamente.' },
                { q: '¿Qué es el servidor MCP y para qué sirve?', a: 'MCP (Model Context Protocol) es el estándar abierto que usan Claude, Cursor, Windsurf y otros agentes para conectarse a fuentes de contexto. Cada proyecto en RAGify expone su propio servidor MCP autenticado por Bearer token con tres herramientas: search_knowledge, ask y list_documents. Lo añades a tu cliente y tu agente pasa a razonar sobre tu conocimiento privado.' },
                { q: '¿Puedo usar a la vez la API REST y MCP?', a: 'Sí. La misma base vectorizada se expone como endpoint REST (/v1/query, streaming SSE) y como servidor MCP (JSON-RPC 2.0). Úsalos en paralelo: REST para tu producto, MCP para tus agentes y editores.' },
                { q: '¿Cómo funciona la API?', a: 'Obtienes un endpoint REST único por proyecto. Envía un POST con tu pregunta y recibe una respuesta generada por IA con contexto de tus documentos. Incluye autenticación por API Key y rate limiting.' },
                { q: '¿Es seguro para datos sensibles?', a: 'Sí. Todos los documentos están encriptados en reposo (AES-256) y en tránsito (TLS 1.3). Los datos están completamente aislados por proyecto y nunca se usan para entrenar modelos de terceros.' },
                { q: '¿Puedo cancelar en cualquier momento?', a: 'Por supuesto. Sin contratos, sin compromiso mínimo. Cambia de plan o cancela desde tu dashboard en cualquier momento.' },
                { q: '¿Qué modelos de IA usan?', a: 'Usamos modelos de última generación como GPT-5 y Gemini para generación de respuestas, y text-embedding-3-small para embeddings vectoriales. Los modelos se actualizan automáticamente.' },
                { q: '¿Puedo integrar con herramientas no-code?', a: 'Sí. Ofrecemos webhooks compatibles con n8n, Zapier y Make. También puedes usar nuestra API REST directamente desde cualquier herramienta que soporte HTTP.' },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border py-2">
                  <AccordionTrigger className="text-left font-medium hover:no-underline gap-4">
                    <span className="font-mono text-xs text-muted-foreground w-8 flex-shrink-0">0{i + 1}</span>
                    <span className="flex-1">{faq.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pl-12">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA - Big bold text */}
      <section className="py-24 md:py-32 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <p className="font-mono text-xs tracking-widest text-muted-foreground mb-6">
              Todo gran producto de IA empieza con gran conocimiento
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-10 leading-[0.95]">
              ¿Listo para construir tu{' '}
              <span className="text-gradient">API de Conocimiento?</span>
            </h2>
            <Button
              size="lg"
              className="gradient-primary h-14 px-10 font-mono text-sm tracking-wider rounded-none hover:opacity-90 transition-opacity"
              onClick={() => navigate('/auth')}
            >
              CREAR MI API DE RAG →

            </Button>

            <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-border">
              <div>
                <span className="text-2xl md:text-3xl font-bold">$0</span>
                <p className="text-xs font-mono text-muted-foreground mt-1">PARA EMPEZAR</p>
              </div>
              <div>
                <span className="text-2xl md:text-3xl font-bold">3 min</span>
                <p className="text-xs font-mono text-muted-foreground mt-1">TIEMPO DE SETUP</p>
              </div>
              <div>
                <span className="text-2xl md:text-3xl font-bold">100%</span>
                <p className="text-xs font-mono text-muted-foreground mt-1">TUS DATOS</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Clean and minimal */}
      <footer className="border-t border-border py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <img src={logo} alt="RAGify" className="h-16 w-auto -ml-3 mb-3 dark:hidden" />
              <img src={logoWhite} alt="RAGify" className="h-16 w-auto -ml-3 mb-3 hidden dark:block" />
              <p className="text-xs font-mono text-muted-foreground">RAG as a Service.</p>
            </div>

            <div>
              <h4 className="font-mono text-xs tracking-widest mb-4">PRODUCTO</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#benefits" className="hover:text-foreground transition-colors">Beneficios</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Precios</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono text-xs tracking-widest mb-4">RECURSOS</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate('/docs')} className="hover:text-foreground transition-colors">Documentación</button></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Referencia API</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Guías</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono text-xs tracking-widest mb-4">LEGAL</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookies</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">GDPR</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono text-xs tracking-widest mb-4">EMPRESA</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Nosotros</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Empleo</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs font-mono text-muted-foreground">© 2026 RAGify. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Twitter className="h-4 w-4" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Github className="h-4 w-4" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Linkedin className="h-4 w-4" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Mail className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============ INLINE COMPONENTS ============ */

function MarqueeTicker() {
  const items = [
    'RAG COMO SERVICIO',
    'SERVIDOR MCP NATIVO',
    'CLAUDE · CURSOR · WINDSURF',
    'SIN ML REQUERIDO',
    'LISTO PARA PRODUCCIÓN',
    'ENCRIPTACIÓN AES-256',
    'EMBEDDINGS REALES',
    '< 100ms LATENCIA',
    'API REST + JSON-RPC',
    'BÚSQUEDA HÍBRIDA',
  ];

  return (
    <div className="border-y border-border bg-primary/5 py-3 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span key={i} className="font-mono text-xs tracking-widest text-primary mx-6 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center py-4 px-6">
      <div className="text-2xl md:text-4xl font-bold mb-1">{value}</div>
      <div className="font-mono text-xs tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function BenefitCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="bg-background p-8 md:p-10 group hover:bg-primary/5 transition-colors duration-300">
      <span className="font-mono text-xs text-muted-foreground">{number}</span>
      <h3 className="font-bold text-lg mt-4 mb-3 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function TimelineStep({ number, title, duration, description, details }: {
  number: string; title: string; duration: string; description: string; details: string[];
}) {
  return (
    <div className="grid grid-cols-12 border-b border-border py-8 md:py-12 group">
      <div className="col-span-1">
        <span className="font-mono text-xs text-muted-foreground">{number}</span>
      </div>
      <div className="col-span-5 md:col-span-3">
        <h3 className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors">{title}</h3>
      </div>
      <div className="col-span-2 md:col-span-2">
        <span className="font-mono text-xs text-muted-foreground">{duration}</span>
      </div>
      <div className="col-span-12 md:col-span-6 mt-4 md:mt-0">
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        <ul className="space-y-1">
          {details.map((d, i) => (
            <li key={i} className="text-xs font-mono text-muted-foreground flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PricingCard({ name, price, period, description, features, highlighted, onCtaClick }: {
  name: string; price: string; period: string; description: string; features: string[]; highlighted?: boolean; onCtaClick: () => void;
}) {
  return (
    <div className={`bg-background p-8 flex flex-col ${highlighted ? 'ring-1 ring-primary bg-primary/5' : ''}`}>
      <div className="mb-8">
        <h3 className="font-mono text-xs tracking-widest mb-4">{name.toUpperCase()}</h3>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-3xl font-bold">{price}</span>
          {period && <span className="text-muted-foreground text-sm">{period}</span>}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className={`w-full rounded-none font-mono text-xs tracking-wider ${highlighted ? 'gradient-primary' : ''}`}
        variant={highlighted ? 'default' : 'outline'}
        onClick={onCtaClick}
      >
        {price === 'Custom' ? 'CONTACTAR VENTAS' : 'EMPEZAR'}
      </Button>
    </div>
  );
}

function McpToolCard({ icon, name, description }: { icon: React.ReactNode; name: string; description: string }) {
  return (
    <div className="bg-background p-8 group hover:bg-primary/5 transition-colors duration-300">
      <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <code className="font-mono text-sm text-primary block mb-3">{name}</code>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

