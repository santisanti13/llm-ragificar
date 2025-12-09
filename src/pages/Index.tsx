import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, FileText, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-surface">
      {/* Hero section */}
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-2xl font-display font-bold">RAGify</span>
          </div>
          <Button onClick={() => navigate('/auth')} variant="outline">
            Iniciar sesión
          </Button>
        </nav>

        <main className="py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              Potenciado por Gemini 2.5 Flash
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              Chatea con tus{' '}
              <span className="text-gradient">documentos</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
              Sube tus PDFs, procesamos automáticamente el contenido, y obtén respuestas
              instantáneas basadas en tu información. RAG simplificado.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '300ms' }}>
              <Button size="lg" className="gradient-primary text-lg h-14 px-8" onClick={() => navigate('/auth')}>
                Comenzar gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-32 max-w-5xl mx-auto">
            <FeatureCard
              icon={FileText}
              title="Sube documentos"
              description="Arrastra y suelta tus PDFs. Procesamiento automático con chunking inteligente."
              delay="400ms"
            />
            <FeatureCard
              icon={Sparkles}
              title="IA de última generación"
              description="Potenciado por Gemini Flash. Respuestas precisas basadas en tu contenido."
              delay="500ms"
            />
            <FeatureCard
              icon={MessageSquare}
              title="Chat contextual"
              description="Conversa naturalmente con tus documentos. Búsqueda semántica en tiempo real."
              delay="600ms"
            />
          </div>
        </main>

        <footer className="py-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2024 RAGify. Construido con Lovable.</p>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: any;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="glass p-6 rounded-xl animate-fade-in"
      style={{ animationDelay: delay }}
    >
      <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}