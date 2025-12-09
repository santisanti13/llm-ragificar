import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Brain, Sparkles, FileText, MessageSquare, ArrowRight, Loader2, 
  Zap, Shield, Code, Globe, Image, FileType, ChevronRight, Star,
  CheckCircle, Users, BarChart3
} from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] gradient-glow pointer-events-none" />
      
      <div className="relative">
        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight">RAGify</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/auth')} className="hidden sm:flex">
              Iniciar sesión
            </Button>
            <Button onClick={() => navigate('/auth')} className="gradient-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
              Comenzar gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div 
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in"
            >
              <Sparkles className="h-4 w-4" />
              <span>RAG-as-a-Service para desarrolladores</span>
              <ChevronRight className="h-3 w-3" />
            </div>
            
            {/* Headline */}
            <h1 
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight opacity-0 animate-fade-in-up"
              style={{ animationDelay: '100ms' }}
            >
              Convierte tus documentos en{' '}
              <span className="text-gradient">APIs inteligentes</span>
            </h1>
            
            {/* Subheadline */}
            <p 
              className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed opacity-0 animate-fade-in-up"
              style={{ animationDelay: '200ms' }}
            >
              Sube PDFs, imágenes, Word, URLs. Entrena tu IA con ejemplos personalizados. 
              Obtén un endpoint API listo para integrar en minutos.
            </p>
            
            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16 opacity-0 animate-fade-in-up"
              style={{ animationDelay: '300ms' }}
            >
              <Button 
                size="lg" 
                className="gradient-primary text-lg h-14 px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all hover:scale-105" 
                onClick={() => navigate('/auth')}
              >
                Crear proyecto gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg h-14 px-8 hover:bg-secondary transition-all"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver características
              </Button>
            </div>

            {/* Social proof */}
            <div 
              className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground opacity-0 animate-fade-in"
              style={{ animationDelay: '500ms' }}
            >
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">500+ usuarios</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="font-medium">10K+ documentos procesados</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
                <span className="ml-1 font-medium">4.9/5</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para <span className="text-gradient">RAG profesional</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Desde la subida de documentos hasta la API lista para producción
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <FeatureCard
              icon={FileType}
              title="Multi-formato"
              description="PDFs, imágenes con OCR, Word, Excel, texto plano y URLs. Todo procesado automáticamente."
              gradient="from-violet-500 to-purple-600"
              delay={0}
            />
            <FeatureCard
              icon={Sparkles}
              title="Entrenamiento personalizado"
              description="Define el tono con system prompts y ejemplos Q&A. Tu IA responde como tú quieres."
              gradient="from-pink-500 to-rose-600"
              delay={100}
            />
            <FeatureCard
              icon={Zap}
              title="Embeddings vectoriales"
              description="Búsqueda semántica real con vectores. Respuestas precisas basadas en contexto relevante."
              gradient="from-amber-500 to-orange-600"
              delay={200}
            />
            <FeatureCard
              icon={Code}
              title="API REST documentada"
              description="Endpoints listos para integrar. Ejemplos en cURL, Python, JavaScript y PHP."
              gradient="from-emerald-500 to-teal-600"
              delay={300}
            />
            <FeatureCard
              icon={MessageSquare}
              title="Chat con historial"
              description="Conversaciones guardadas, streaming en tiempo real, markdown renderizado."
              gradient="from-blue-500 to-cyan-600"
              delay={400}
            />
            <FeatureCard
              icon={BarChart3}
              title="Analytics completo"
              description="Dashboard con uso, latencia, preguntas frecuentes. Exporta a CSV."
              gradient="from-indigo-500 to-violet-600"
              delay={500}
            />
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 py-24 border-t border-border/50">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Listo en <span className="text-gradient-accent">3 pasos</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <StepCard
              number="01"
              title="Sube tus documentos"
              description="Arrastra PDFs, imágenes, Word o pega URLs. Procesamos todo automáticamente."
            />
            <StepCard
              number="02"
              title="Entrena tu asistente"
              description="Define el system prompt y añade ejemplos de respuestas esperadas."
            />
            <StepCard
              number="03"
              title="Integra tu API"
              description="Obtén tu endpoint y empieza a hacer queries desde tu aplicación."
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto glass-strong rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 gradient-mesh opacity-50" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Comienza a construir tu RAG hoy
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Sin tarjeta de crédito. Configura tu primer proyecto en menos de 5 minutos.
              </p>
              <Button 
                size="lg" 
                className="gradient-primary text-lg h-14 px-10 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all hover:scale-105" 
                onClick={() => navigate('/auth')}
              >
                Crear cuenta gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 py-12">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">RAGify</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 RAGify. RAG-as-a-Service. Construido con Lovable.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
  delay,
}: {
  icon: any;
  title: string;
  description: string;
  gradient: string;
  delay: number;
}) {
  return (
    <div
      className="glass group p-6 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="text-6xl font-bold text-gradient mb-4">{number}</div>
      <h3 className="font-semibold text-xl mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}