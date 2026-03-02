import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, Loader2, Shield, Code, FileText, Bot, Terminal, Check,
  ChevronRight, Sparkles, Database, Lock, Globe, Upload, Brain, Rocket,
  Menu, X, Play, Layers, Eye, Zap, Mail, Twitter, Github, Linkedin,
  Star, Quote, BarChart3, Search, Key, FileCode, Server, Users
} from 'lucide-react';
import logo from '@/assets/logo.png';
import logoWhite from '@/assets/logo-white.png';
import logoHeroSf from '@/assets/logo-hero-sf.png';

export default function Index() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="RAGify" className="h-28 md:h-36 w-auto -my-8 dark:hidden drop-shadow-[0_0_10px_hsl(65,100%,50%,0.5)]" />
            <img src={logoWhite} alt="RAGify" className="h-28 md:h-36 w-auto -my-8 hidden dark:block drop-shadow-[0_0_15px_hsl(65,100%,50%,0.6)]" />
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">Características</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">Cómo funciona</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">Precios</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">FAQ</a>
            <button onClick={() => navigate('/docs')} className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">Docs</button>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="hidden sm:flex">Iniciar sesión</Button>
            <Button size="sm" onClick={() => navigate('/auth')} className="gradient-primary text-xs md:text-sm px-3 md:px-4">
              <span className="hidden sm:inline">Empezar gratis</span>
              <span className="sm:hidden">Empezar</span>
              <ArrowRight className="ml-1 h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-lg border-b border-border animate-fade-in">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Características</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Cómo funciona</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Precios</a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <button onClick={() => { navigate('/docs'); setMobileMenuOpen(false); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 text-left">Docs</button>
              <Button variant="outline" size="sm" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="w-full mt-2">Iniciar sesión</Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-28 md:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 relative">
          <div className="max-w-5xl mx-auto text-center">
            <div className="mb-6 flex justify-center">
              <img
                src={logoHeroSf}
                alt="RAGify"
                className="h-32 md:h-40 lg:h-48 w-auto drop-shadow-[0_0_25px_hsl(65,100%,50%,0.6)] dark:drop-shadow-[0_0_30px_hsl(65,100%,50%,0.7)]"
              />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
              Tu conocimiento.{' '}
              <span className="text-gradient">Tu IA.</span>
              <br />
              <span className="text-muted-foreground font-semibold text-3xl md:text-4xl lg:text-5xl">
                Una API. Sin infraestructura.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Sube documentos, entrena con tus datos, y despliega un endpoint RAG
              listo para producción en minutos. Sin ML. Sin DevOps.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="gradient-primary h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all" onClick={() => navigate('/auth')}>
                Crear proyecto gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                <Play className="mr-2 h-4 w-4" />
                Ver cómo funciona
              </Button>
            </div>

            {/* Terminal Demo */}
            <TerminalDemo />

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-muted-foreground mt-10">
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Sin tarjeta de crédito</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Setup en 3 minutos</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />API REST documentada</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Embeddings reales</div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar - Animated Stats */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <AnimatedCounter end={500} suffix="+" label="Desarrolladores" />
            <div className="hidden md:block w-px h-8 bg-border" />
            <AnimatedCounter end={10000} suffix="+" label="Documentos procesados" format />
            <div className="hidden md:block w-px h-8 bg-border" />
            <AnimatedCounter end={99.9} suffix="%" label="Uptime garantizado" decimal />
            <div className="hidden md:block w-px h-8 bg-border" />
            <AnimatedCounter end={100} prefix="<" suffix="ms" label="Latencia promedio" />
          </div>
        </div>
      </section>

      {/* Features Section with Tabs */}
      <section id="features" className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary font-medium mb-3">CARACTERÍSTICAS</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que necesitas para RAG en producción</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Sin infraestructura que mantener. Sin modelos que entrenar. Solo tu conocimiento, convertido en API.</p>
          </div>

          <Tabs defaultValue="documentos" className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-4 max-w-lg mx-auto mb-12 h-12">
              <TabsTrigger value="documentos" className="gap-2"><FileText className="h-4 w-4" />Documentos</TabsTrigger>
              <TabsTrigger value="ia" className="gap-2"><Brain className="h-4 w-4" />IA</TabsTrigger>
              <TabsTrigger value="api" className="gap-2"><Code className="h-4 w-4" />API</TabsTrigger>
              <TabsTrigger value="seguridad" className="gap-2"><Shield className="h-4 w-4" />Seguridad</TabsTrigger>
            </TabsList>

            <TabsContent value="documentos">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Procesa cualquier formato</h3>
                  <p className="text-muted-foreground mb-6">PDFs, Word, Excel, imágenes con OCR, URLs. Procesamos, chunkeamos y vectorizamos automáticamente con embeddings de alta dimensión.</p>
                  <ul className="space-y-3">
                    {['OCR para capturas y scans', 'Extracción inteligente de tablas', 'Chunking semántico automático', 'Soporte markdown y HTML'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm"><ChevronRight className="h-4 w-4 text-primary" />{item}</li>
                    ))}
                  </ul>
                </div>
                <FeatureMockup icon={Upload} title="Sube tu conocimiento" items={['manual-usuario.pdf — 2.4MB ✓', 'politicas-rrhh.docx — 890KB ✓', 'catalogo-2025.xlsx — 1.1MB ⏳']} />
              </div>
            </TabsContent>

            <TabsContent value="ia">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Entrenamiento sin código</h3>
                  <p className="text-muted-foreground mb-6">Define cómo responde tu asistente con system prompts y ejemplos Q&A. Controla tono, formato y precisión sin tocar un modelo.</p>
                  <ul className="space-y-3">
                    {['System prompts personalizados', 'Ejemplos few-shot editables', 'Control de tono y estilo', 'Generación automática de Q&A'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm"><ChevronRight className="h-4 w-4 text-primary" />{item}</li>
                    ))}
                  </ul>
                </div>
                <FeatureMockup icon={Bot} title="Entrena tu asistente" items={['System prompt: "Eres un asistente..."', '5 ejemplos Q&A configurados', 'Tono: Profesional y conciso']} />
              </div>
            </TabsContent>

            <TabsContent value="api">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-4">API REST en minutos</h3>
                  <p className="text-muted-foreground mb-6">Un endpoint único con autenticación por API key. Ejemplos en cURL, Python, JavaScript y más. Integra en cualquier stack.</p>
                  <ul className="space-y-3">
                    {['cURL, Python, JS, PHP, Go', 'Autenticación por API Key', 'Rate limiting incluido', 'Webhooks para n8n, Zapier, Make'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm"><ChevronRight className="h-4 w-4 text-primary" />{item}</li>
                    ))}
                  </ul>
                </div>
                <FeatureMockup icon={Terminal} title="Tu endpoint listo" items={['POST /v1/query — 200 OK', 'Latencia: 87ms', 'Tokens: 342']} />
              </div>
            </TabsContent>

            <TabsContent value="seguridad">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Seguridad enterprise</h3>
                  <p className="text-muted-foreground mb-6">Documentos encriptados, aislados por proyecto. Tus datos nunca se comparten con terceros ni se usan para entrenar modelos.</p>
                  <ul className="space-y-3">
                    {['Encryption at rest y en tránsito', 'Aislamiento por tenant', 'GDPR compliant', 'Logs de auditoría completos'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm"><ChevronRight className="h-4 w-4 text-primary" />{item}</li>
                    ))}
                  </ul>
                </div>
                <FeatureMockup icon={Lock} title="Protección total" items={['Encriptación: AES-256 ✓', 'RLS habilitado ✓', 'Datos aislados ✓']} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium text-sm">CÓMO FUNCIONA</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              De cero a API en <span className="text-primary">3 simples pasos</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Sin infraestructura. Sin configuración compleja. Solo sube, entrena e integra.</p>
          </div>
          <StaggeredCards />
        </div>
      </section>

      {/* Code example section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-primary font-medium mb-3">INTEGRACIÓN SIMPLE</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Una llamada API. Eso es todo.</h2>
                <p className="text-muted-foreground text-lg mb-8">Sin SDKs complicados. Sin configuración de modelos. Solo un POST con tu pregunta y obtienes la respuesta.</p>
                <div className="space-y-4">
                  {['Respuestas con contexto de tus documentos', 'Streaming opcional para UX fluida', 'Metadata de chunks usados en cada respuesta'].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5"><Check className="h-3.5 w-3.5" /></div>
                      <p className="text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 bg-primary/5 rounded-2xl blur-2xl" />
                <div className="relative bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive/60" />
                      <div className="w-3 h-3 rounded-full bg-warning/60" />
                      <div className="w-3 h-3 rounded-full bg-primary/60" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">api-request.js</span>
                  </div>
                  <pre className="p-6 text-sm overflow-x-auto">
                    <code className="text-muted-foreground">
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
      query: '¿Cuál es la política de devoluciones?'
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

      {/* Pricing section */}
      <section id="pricing" className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-primary font-medium mb-3">PRECIOS</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Empieza gratis. Escala cuando quieras.</h2>
            <p className="text-muted-foreground text-lg mb-8">Sin sorpresas. Paga solo por lo que usas.</p>

            {/* Annual/Monthly toggle */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Mensual</span>
              <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
              <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Anual</span>
              {isAnnual && <Badge className="gradient-primary text-primary-foreground border-0 ml-1">-20%</Badge>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
            <PricingCard name="Free" price={0} description="Para probar y proyectos personales" features={['1 proyecto', '50 queries/mes', '25MB de documentos', 'API documentada', 'Soporte community']} cta="Empezar gratis" onCtaClick={() => navigate('/auth')} isAnnual={isAnnual} />
            <PricingCard name="Starter" price={15} description="Para proyectos en crecimiento" features={['3 proyectos', '1,000 queries/mes', '200MB de documentos', 'Analytics básico', 'Soporte por email', 'Custom prompts']} cta="Comenzar" onCtaClick={() => navigate('/auth')} isAnnual={isAnnual} />
            <PricingCard name="Pro" price={49} description="Para startups y equipos" features={['10 proyectos', '10K queries/mes', '1GB de documentos', 'Analytics avanzado', 'Soporte prioritario', 'Webhooks', 'API keys ilimitadas']} highlighted cta="Comenzar prueba" onCtaClick={() => navigate('/auth')} isAnnual={isAnnual} />
            <PricingCard name="Enterprise" price={-1} description="Para grandes organizaciones" features={['Proyectos ilimitados', 'Queries ilimitadas', 'Storage ilimitado', 'SSO / SAML', 'SLA garantizado', 'Soporte dedicado', 'On-premise disponible']} cta="Contactar ventas" onCtaClick={() => navigate('/auth')} isAnnual={isAnnual} />
          </div>

          {/* Comparison table */}
          <ComparisonTable />
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary font-medium mb-3">TESTIMONIOS</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Lo que dicen nuestros usuarios</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <TestimonialCard name="Carlos Mendez" role="CTO" company="TechFlow" quote="RAGify nos ahorró 3 meses de desarrollo. Teníamos un chatbot interno en producción en 2 días." avatar="CM" />
            <TestimonialCard name="Ana García" role="Product Manager" company="DataPrime" quote="La API es increíblemente simple. Nuestro equipo de soporte redujo tickets un 40% con el asistente." avatar="AG" />
            <TestimonialCard name="Miguel Torres" role="Founder" company="AIStartup" quote="Probamos 5 soluciones RAG. RAGify fue la única que funcionó out-of-the-box sin configuración de infra." avatar="MT" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary font-medium mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Preguntas frecuentes</h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-2">
              {[
                { q: '¿Qué tipos de documentos puedo subir?', a: 'Soportamos PDF, Word (.docx), Excel (.xlsx), imágenes (con OCR automático), archivos Markdown y HTML. Cada documento se procesa, se divide en chunks inteligentes y se vectoriza automáticamente.' },
                { q: '¿Cómo funciona la API?', a: 'Obtienes un endpoint REST único por proyecto. Envías un POST con tu pregunta y recibes la respuesta generada por IA con contexto de tus documentos. Incluye autenticación por API Key y rate limiting.' },
                { q: '¿Es seguro para datos sensibles?', a: 'Sí. Todos los documentos se encriptan en reposo (AES-256) y en tránsito (TLS 1.3). Los datos están completamente aislados por proyecto y nunca se usan para entrenar modelos de terceros.' },
                { q: '¿Puedo cancelar en cualquier momento?', a: 'Absolutamente. No hay contratos ni permanencia mínima. Puedes cambiar de plan o cancelar desde tu dashboard en cualquier momento.' },
                { q: '¿Qué modelos de IA utilizan?', a: 'Utilizamos modelos de última generación como GPT-5 y Gemini para la generación de respuestas, y text-embedding-3-small para los embeddings vectoriales. Los modelos se actualizan automáticamente.' },
                { q: '¿Puedo integrar RAGify con herramientas no-code?', a: 'Sí. Ofrecemos webhooks compatibles con n8n, Zapier y Make. También puedes usar nuestra API REST directamente desde cualquier herramienta que soporte HTTP.' },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-lg px-6">
                  <AccordionTrigger className="text-left font-medium hover:no-underline">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA with email input */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Convierte tu documentación en una ventaja competitiva</h2>
            <p className="text-muted-foreground text-lg mb-10">Únete a cientos de desarrolladores que ya usan RAGify para construir asistentes inteligentes sin la complejidad del ML.</p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8">
              <Input type="email" placeholder="tu@email.com" className="h-12 bg-card" />
              <Button size="lg" className="gradient-primary h-12 px-8 whitespace-nowrap" onClick={() => navigate('/auth')}>
                Empezar gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Sin tarjeta requerida</div>
              <div className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Datos encriptados</div>
              <div className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Setup en 3 min</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <img src={logo} alt="RAGify" className="h-20 w-auto -ml-4 mb-2 dark:hidden" />
              <img src={logoWhite} alt="RAGify" className="h-20 w-auto -ml-4 mb-2 hidden dark:block" />
              <p className="text-sm text-muted-foreground">RAG como servicio. Simple, rápido, seguro.</p>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Precios</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Recursos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate('/docs')} className="hover:text-foreground transition-colors">Documentación</button></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Guías</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookies</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">GDPR</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Sobre nosotros</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Empleo</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2025 RAGify. Todos los derechos reservados.</p>
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

function TerminalDemo() {
  const [displayedLines, setDisplayedLines] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  const lines = [
    { type: 'comment', text: '# Consulta a tu base de conocimiento' },
    { type: 'command', text: 'curl -X POST https://api.ragify.dev/v1/query \\' },
    { type: 'command', text: '  -H "Authorization: Bearer rg_live_abc123" \\' },
    { type: 'command', text: '  -d \'{"query": "¿Cuál es la política de devoluciones?"}\'' },
    { type: 'empty', text: '' },
    { type: 'response', text: '{ "answer": "La política de devoluciones permite...' },
    { type: 'response', text: '  devolver productos en 30 días con recibo.",' },
    { type: 'response', text: '  "confidence": 0.94, "latency_ms": 87 }' },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    if (displayedLines >= lines.length) return;
    const timer = setTimeout(() => setDisplayedLines(prev => prev + 1), 400);
    return () => clearTimeout(timer);
  }, [started, displayedLines, lines.length]);

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto">
      <div className="relative">
        <div className="absolute -inset-3 bg-primary/5 rounded-2xl blur-xl" />
        <div className="relative bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-primary/60" />
            </div>
            <span className="text-xs text-muted-foreground ml-2 font-mono">terminal</span>
          </div>
          <div className="p-5 font-mono text-sm min-h-[220px] text-left">
            {lines.slice(0, displayedLines).map((line, i) => (
              <div key={i} className={`animate-fade-in ${line.type === 'comment' ? 'text-muted-foreground' : line.type === 'response' ? 'text-primary' : 'text-foreground'}`}>
                {line.type === 'command' && <span className="text-primary mr-2">$</span>}
                {line.type === 'comment' && <span className="text-muted-foreground">{line.text}</span>}
                {line.type === 'command' && <span>{line.text}</span>}
                {line.type === 'response' && <span>{line.text}</span>}
                {line.type === 'empty' && <br />}
              </div>
            ))}
            {displayedLines < lines.length && displayedLines > 0 && (
              <span className="inline-block w-2 h-4 bg-primary animate-cursor" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedCounter({ end, suffix = '', prefix = '', label, decimal = false, format = false }: {
  end: number; suffix?: string; prefix?: string; label: string; decimal?: boolean; format?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1500;
    const steps = 40;
    const increment = end / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, end]);

  const displayValue = decimal ? count.toFixed(1) : format ? Math.floor(count).toLocaleString() : Math.floor(count);

  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-foreground">{prefix}{displayValue}{suffix}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function FeatureMockup({ icon: Icon, title, items }: { icon: any; title: string; items: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -inset-3 bg-primary/5 rounded-2xl blur-xl" />
      <div className="relative bg-card border border-border rounded-xl overflow-hidden shadow-xl">
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="p-5 space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ name, role, company, quote, avatar }: {
  name: string; role: string; company: string; quote: string; avatar: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 card-interactive">
      <Quote className="h-8 w-8 text-primary/30 mb-4" />
      <p className="text-muted-foreground text-sm mb-6 leading-relaxed italic">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">{avatar}</div>
        <div>
          <p className="font-medium text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{role}, {company}</p>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ name, price, description, features, highlighted, cta, onCtaClick, isAnnual }: {
  name: string; price: number; description: string; features: string[]; highlighted?: boolean; cta: string; onCtaClick: () => void; isAnnual: boolean;
}) {
  const isCustom = price === -1;
  const displayPrice = isCustom ? 'Custom' : `$${isAnnual ? Math.round(price * 0.8) : price}`;

  return (
    <div className={`relative bg-card border rounded-xl p-6 flex flex-col ${highlighted ? 'border-primary shadow-lg ring-1 ring-primary/20 glow-sm' : 'border-border'}`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gradient-primary text-primary-foreground border-0 animate-pulse-soft">⚡ Popular</Badge>
        </div>
      )}
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-1">{name}</h3>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-3xl font-bold">{displayPrice}</span>
          {!isCustom && <span className="text-muted-foreground">/mes</span>}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="space-y-3 mb-6 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <Button className={`w-full ${highlighted ? 'gradient-primary' : ''}`} variant={highlighted ? 'default' : 'outline'} onClick={onCtaClick}>
        {cta}
      </Button>
    </div>
  );
}

function ComparisonTable() {
  const features = [
    { name: 'Proyectos', free: '1', starter: '3', pro: '10', enterprise: 'Ilimitados' },
    { name: 'Queries/mes', free: '50', starter: '1,000', pro: '10,000', enterprise: 'Ilimitadas' },
    { name: 'Almacenamiento', free: '25MB', starter: '200MB', pro: '1GB', enterprise: 'Ilimitado' },
    { name: 'API Keys', free: '1', starter: '3', pro: 'Ilimitadas', enterprise: 'Ilimitadas' },
    { name: 'Analytics', free: '—', starter: 'Básico', pro: 'Avanzado', enterprise: 'Custom' },
    { name: 'Webhooks', free: '—', starter: '—', pro: '✓', enterprise: '✓' },
    { name: 'SSO/SAML', free: '—', starter: '—', pro: '—', enterprise: '✓' },
    { name: 'SLA', free: '—', starter: '—', pro: '99.9%', enterprise: '99.99%' },
    { name: 'Soporte', free: 'Community', starter: 'Email', pro: 'Prioritario', enterprise: 'Dedicado' },
  ];

  return (
    <div className="max-w-5xl mx-auto overflow-x-auto">
      <h3 className="text-xl font-bold text-center mb-8">Comparativa de planes</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Feature</th>
            <th className="text-center py-3 px-4 font-semibold">Free</th>
            <th className="text-center py-3 px-4 font-semibold">Starter</th>
            <th className="text-center py-3 px-4 font-semibold text-primary">Pro</th>
            <th className="text-center py-3 px-4 font-semibold">Enterprise</th>
          </tr>
        </thead>
        <tbody>
          {features.map((row, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-3 px-4 font-medium">{row.name}</td>
              <td className="text-center py-3 px-4 text-muted-foreground">{row.free}</td>
              <td className="text-center py-3 px-4 text-muted-foreground">{row.starter}</td>
              <td className="text-center py-3 px-4">{row.pro}</td>
              <td className="text-center py-3 px-4 text-muted-foreground">{row.enterprise}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HowItWorksCard({ step, title, description, icon: Icon, features, gradient, iconBg, highlighted }: {
  step: number; title: string; description: string; icon: any; features: string[]; gradient: string; iconBg: string; highlighted?: boolean;
}) {
  return (
    <div className={`group relative rounded-2xl p-[1px] transition-all duration-500 hover:scale-[1.02] ${highlighted ? 'bg-gradient-to-b from-primary via-neon-green to-primary/50' : 'bg-gradient-to-b from-border to-border/50 hover:from-primary/50 hover:to-primary/20'}`}>
      <div className="relative h-full bg-card rounded-2xl p-6 lg:p-8 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <span className="text-sm font-bold text-muted-foreground">0{step}</span>
        </div>
        <div className={`relative w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="relative">
          <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-5">{description}</p>
          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-foreground/80">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-primary/5 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </div>
  );
}

function StaggeredCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
    }, { threshold: 0.2 });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const cards = [
    { step: 1, title: "Sube tu conocimiento", description: "Arrastra PDFs, imágenes, Word, o pega URLs. Nosotros extraemos, limpiamos y vectorizamos automáticamente.", icon: Upload, features: ['PDFs, Word, imágenes', 'URLs y sitios web', 'Vectorización automática'], gradient: "from-primary/20 via-neon-green/20 to-primary/10", iconBg: "bg-gradient-to-br from-primary to-neon-green" },
    { step: 2, title: "Entrena el comportamiento", description: "Define cómo debe responder tu asistente con prompts personalizados y ejemplos de Q&A.", icon: Brain, features: ['System prompt custom', 'Ejemplos Q&A', 'Tono y estilo únicos'], gradient: "from-primary/20 via-neon-green/20 to-primary/10", iconBg: "bg-gradient-to-br from-primary to-neon-green", highlighted: true },
    { step: 3, title: "Integra tu API", description: "Copia tu endpoint y API key. Haz tu primera query en segundos con cualquier lenguaje.", icon: Rocket, features: ['API REST simple', 'Streaming opcional', 'SDKs disponibles'], gradient: "from-primary/20 via-neon-green/20 to-primary/10", iconBg: "bg-gradient-to-br from-primary to-neon-green" },
  ];

  return (
    <div ref={containerRef} className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
      {cards.map((card, index) => (
        <div key={card.step} className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`} style={{ transitionDelay: isVisible ? `${index * 150}ms` : '0ms' }}>
          <HowItWorksCard {...card} />
        </div>
      ))}
    </div>
  );
}
