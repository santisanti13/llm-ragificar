import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Zap, Shield, Code, FileText, Bot, Layers, Terminal, Play, Check, ChevronRight, Sparkles, Database, Lock, Globe, Upload, Brain, Rocket } from 'lucide-react';
import logo from '@/assets/logo.png';
import logoWhite from '@/assets/logo-white.png';
import { RotatingText } from '@/components/RotatingText';
const heroRotatingPhrases = ['Tu IA a medida en minutos', 'RAG sin infraestructura', 'APIs inteligentes al instante', 'Tu conocimiento, automatizado', 'Chatbots con tu contenido', 'Búsqueda semántica potente', 'Respuestas precisas, siempre', 'De PDF a API en segundos', 'IA contextual sin código', 'Tu asistente personalizado'];
export default function Index() {
  const navigate = useNavigate();
  const {
    user,
    loading
  } = useAuth();
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="RAGify" className="h-28 w-auto -my-6 dark:hidden" />
            <img src={logoWhite} alt="RAGify" className="h-28 w-auto -my-6 hidden dark:block" />
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">
              Características
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">
              Cómo funciona
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">
              Precios
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="hidden sm:flex">
              Iniciar sesión
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')} className="gradient-primary">
              Empezar gratis
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 relative overflow-hidden">
        {/* Subtle background grid */}
        <div className="absolute inset-0 bg-grid opacity-50" />
        
        {/* Gradient orb */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              RAG-as-a-Service para developers
            </div>
            
            {/* Headline - Clean and impactful */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight">Tu RAGify
De PDF a API en segundos<br />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent inline-block">
                <RotatingText phrases={heroRotatingPhrases} interval={3500} className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent" />
              </span>
            </h1>
            
            {/* Subheadline - Clear value prop */}
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Sube cualquier documento, entrena con ejemplos propios, 
              y obtén un endpoint REST listo para producción en minutos.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button size="lg" className="gradient-primary h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all" onClick={() => navigate('/auth')}>
                Crear proyecto gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({
              behavior: 'smooth'
            })}>
                <Play className="mr-2 h-4 w-4" />
                Ver demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Sin tarjeta de crédito
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Setup en 3 minutos
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                API documentada
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <Stat value="500+" label="Desarrolladores" />
            <div className="hidden md:block w-px h-8 bg-border" />
            <Stat value="10K+" label="Documentos procesados" />
            <div className="hidden md:block w-px h-8 bg-border" />
            <Stat value="99.9%" label="Uptime" />
            <div className="hidden md:block w-px h-8 bg-border" />
            <Stat value="<100ms" label="Latencia promedio" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary font-medium mb-3">CARACTERÍSTICAS</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para RAG en producción
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sin infraestructura que mantener. Sin modelos que entrenar.
              Solo tu conocimiento, convertido en API.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <FeatureCard icon={FileText} title="Multi-formato inteligente" description="PDFs, Word, Excel, imágenes con OCR, URLs. Procesamos y chunkeamos automáticamente." bullets={['OCR para capturas y scans', 'Extracción de tablas', 'Soporte markdown']} />
            <FeatureCard icon={Bot} title="Entrenamiento sin código" description="Define el comportamiento con prompts y ejemplos Q&A. Tu IA responde como tú quieres." bullets={['System prompts custom', 'Ejemplos few-shot', 'Control de tono y estilo']} />
            <FeatureCard icon={Database} title="Embeddings vectoriales" description="Búsqueda semántica real con vectores de alta dimensión para máxima precisión." bullets={['Chunking inteligente', 'Similarity search', 'Top-K configurable']} />
            <FeatureCard icon={Terminal} title="API REST lista" description="Endpoint único con ejemplos en todos los lenguajes. Integra en minutos." bullets={['cURL, Python, JS, PHP', 'Auth por API Key', 'Rate limiting incluido']} />
            <FeatureCard icon={Lock} title="Seguridad enterprise" description="Tus documentos encriptados, aislados por proyecto, sin compartir con terceros." bullets={['Encryption at rest', 'Aislamiento por tenant', 'GDPR compliant']} />
            <FeatureCard icon={Layers} title="Dashboard analítico" description="Métricas de uso, historial de queries, latencias. Todo exportable a CSV." bullets={['Queries por día', 'Latencia P50/P95', 'Logs de errores']} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 md:py-32 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium text-sm">CÓMO FUNCIONA</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              De cero a API en{' '}
              <span className="text-gradient">3 simples pasos</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sin infraestructura. Sin configuración compleja. Solo sube, entrena e integra.
            </p>
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
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Una llamada API. Eso es todo.
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Sin SDKs complicados. Sin configuración de modelos. 
                  Solo un POST con tu pregunta y obtienes la respuesta.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">Respuestas con contexto de tus documentos</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">Streaming opcional para UX fluida</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-muted-foreground">Metadata de chunks usados en cada respuesta</p>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/5 rounded-2xl blur-2xl" />
                <div className="relative bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive/60" />
                      <div className="w-3 h-3 rounded-full bg-warning/60" />
                      <div className="w-3 h-3 rounded-full bg-success/60" />
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
          <div className="text-center mb-16">
            <p className="text-primary font-medium mb-3">PRECIOS</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Empieza gratis. Escala cuando quieras.
            </h2>
            <p className="text-muted-foreground text-lg">
              Sin sorpresas. Paga solo por lo que usas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PricingCard name="Free" price="$0" description="Para probar y proyectos personales" features={['1 proyecto', '100 queries/mes', '50MB de documentos', 'API documentada', 'Soporte por email']} cta="Empezar gratis" onCtaClick={() => navigate('/auth')} />
            <PricingCard name="Pro" price="$29" description="Para startups y equipos pequeños" features={['10 proyectos', '10K queries/mes', '1GB de documentos', 'Analytics avanzado', 'Soporte prioritario', 'Custom system prompts']} highlighted cta="Comenzar prueba" onCtaClick={() => navigate('/auth')} />
            <PricingCard name="Enterprise" price="Custom" description="Para grandes organizaciones" features={['Proyectos ilimitados', 'Queries ilimitadas', 'Storage ilimitado', 'SSO / SAML', 'SLA garantizado', 'Soporte dedicado']} cta="Contactar ventas" onCtaClick={() => navigate('/auth')} />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Convierte tu documentación en una ventaja competitiva
            </h2>
            <p className="text-muted-foreground text-lg mb-10">
              Únete a cientos de desarrolladores que ya usan RAGify para construir 
              asistentes inteligentes sin la complejidad del ML.
            </p>
            <Button size="lg" className="gradient-primary h-14 px-10 text-lg shadow-lg hover:shadow-xl transition-all" onClick={() => navigate('/auth')}>
              Crear mi primer proyecto
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src={logo} alt="RAGify" className="h-6" />
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Documentación</a>
              <a href="#" className="hover:text-foreground transition-colors">Changelog</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacidad</a>
              <a href="#" className="hover:text-foreground transition-colors">Términos</a>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2024 RAGify. Hecho con Lovable.
            </p>
          </div>
        </div>
      </footer>
    </div>;
}

// Components
function Stat({
  value,
  label
}: {
  value: string;
  label: string;
}) {
  return <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>;
}
function FeatureCard({
  icon: Icon,
  title,
  description,
  bullets
}: {
  icon: any;
  title: string;
  description: string;
  bullets: string[];
}) {
  return <div className="group bg-card border border-border rounded-xl p-6 card-interactive">
      <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{description}</p>
      <ul className="space-y-2">
        {bullets.map((bullet, i) => <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <ChevronRight className="h-3 w-3 text-primary" />
            {bullet}
          </li>)}
      </ul>
    </div>;
}
function HowItWorksCard({
  step,
  title,
  description,
  icon: Icon,
  features,
  gradient,
  iconBg,
  highlighted
}: {
  step: number;
  title: string;
  description: string;
  icon: any;
  features: string[];
  gradient: string;
  iconBg: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`group relative rounded-2xl p-[1px] transition-all duration-500 hover:scale-[1.02] ${
      highlighted ? 'bg-gradient-to-b from-primary via-neon-green to-primary/50' : 'bg-gradient-to-b from-border to-border/50 hover:from-primary/50 hover:to-primary/20'
    }`}>
      <div className={`relative h-full bg-card rounded-2xl p-6 lg:p-8 overflow-hidden`}>
        {/* Background glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        {/* Step number badge */}
        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <span className="text-sm font-bold text-muted-foreground">0{step}</span>
        </div>
        
        {/* Icon */}
        <div className={`relative w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        
        {/* Content */}
        <div className="relative">
          <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-5">{description}</p>
          
          {/* Features list */}
          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-foreground/80">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Decorative corner */}
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-primary/5 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </div>
  );
}

function StaggeredCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const cards = [
    {
      step: 1,
      title: "Sube tu conocimiento",
      description: "Arrastra PDFs, imágenes, Word, o pega URLs. Nosotros extraemos, limpiamos y vectorizamos automáticamente.",
      icon: Upload,
      features: ['PDFs, Word, imágenes', 'URLs y sitios web', 'Vectorización automática'],
      gradient: "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500"
    },
    {
      step: 2,
      title: "Entrena el comportamiento",
      description: "Define cómo debe responder tu asistente con prompts personalizados y ejemplos de Q&A.",
      icon: Brain,
      features: ['System prompt custom', 'Ejemplos Q&A', 'Tono y estilo únicos'],
      gradient: "from-primary/20 via-neon-green/20 to-emerald-500/20",
      iconBg: "bg-gradient-to-br from-primary to-neon-green",
      highlighted: true
    },
    {
      step: 3,
      title: "Integra tu API",
      description: "Copia tu endpoint y API key. Haz tu primera query en segundos con cualquier lenguaje.",
      icon: Rocket,
      features: ['API REST simple', 'Streaming opcional', 'SDKs disponibles'],
      gradient: "from-violet-500/20 via-purple-500/20 to-fuchsia-500/20",
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-500"
    }
  ];

  return (
    <div ref={containerRef} className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
      {cards.map((card, index) => (
        <div
          key={card.step}
          className={`transition-all duration-700 ease-out ${
            isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-12'
          }`}
          style={{ 
            transitionDelay: isVisible ? `${index * 150}ms` : '0ms'
          }}
        >
          <HowItWorksCard {...card} />
        </div>
      ))}
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted,
  cta,
  onCtaClick
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  onCtaClick: () => void;
}) {
  return <div className={`relative bg-card border rounded-xl p-6 ${highlighted ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-border'}`}>
      {highlighted && <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
            Popular
          </span>
        </div>}
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-1">{name}</h3>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-3xl font-bold">{price}</span>
          {price !== 'Custom' && <span className="text-muted-foreground">/mes</span>}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-success flex-shrink-0" />
            {feature}
          </li>)}
      </ul>
      <Button className={`w-full ${highlighted ? 'gradient-primary' : ''}`} variant={highlighted ? 'default' : 'outline'} onClick={onCtaClick}>
        {cta}
      </Button>
    </div>;
}