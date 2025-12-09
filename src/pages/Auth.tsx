import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Brain, Sparkles, FileText, MessageSquare, ArrowLeft, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
});

const passwordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type AuthMode = 'login' | 'forgot' | 'reset';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    // Check if user arrived from password reset email
    const isReset = searchParams.get('reset') === 'true';
    if (isReset) {
      setMode('reset');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && mode !== 'reset') {
      navigate('/dashboard');
    }
  }, [user, navigate, mode]);

  const handleSubmit = async (mode: 'signin' | 'signup') => {
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = mode === 'signin' 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este email ya está registrado. Intenta iniciar sesión.');
        } else if (error.message.includes('Invalid login')) {
          toast.error('Email o contraseña incorrectos.');
        } else {
          toast.error(error.message);
        }
      } else if (mode === 'signup') {
        toast.success('¡Cuenta creada! Redirigiendo al dashboard...');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Te hemos enviado un email con instrucciones para restablecer tu contraseña.');
        setMode('login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
      } else {
        setResetSuccess(true);
        toast.success('¡Contraseña actualizada correctamente!');
        // Clear URL params
        window.history.replaceState({}, '', '/auth');
        setTimeout(() => {
          setMode('login');
          setResetSuccess(false);
          setPassword('');
          setConfirmPassword('');
        }, 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-surface flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-primary-foreground flex items-center gap-3">
            <Brain className="h-10 w-10" />
            RAGify
          </h1>
          <p className="mt-2 text-primary-foreground/80 text-lg">
            Tu plataforma de RAG inteligente
          </p>
        </div>
        
        <div className="space-y-8">
          <FeatureItem 
            icon={FileText} 
            title="Sube tus documentos"
            description="PDF, Word y más. Procesamiento automático con chunking inteligente."
          />
          <FeatureItem 
            icon={Sparkles} 
            title="IA de última generación"
            description="Potenciado por Gemini y GPT-5. Respuestas precisas basadas en tu contenido."
          />
          <FeatureItem 
            icon={MessageSquare} 
            title="Chat contextual"
            description="Conversa con tus documentos. Obtén respuestas instantáneas."
          />
        </div>

        <p className="text-primary-foreground/60 text-sm">
          © 2024 RAGify. Construido con Lovable.
        </p>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md glass animate-fade-in">
          <CardHeader className="text-center">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-2xl font-display font-bold">RAGify</span>
            </div>
            {mode === 'reset' ? (
              <>
                <CardTitle className="text-2xl font-display">Nueva contraseña</CardTitle>
                <CardDescription>
                  Ingresa tu nueva contraseña
                </CardDescription>
              </>
            ) : mode === 'forgot' ? (
              <>
                <CardTitle className="text-2xl font-display">Recuperar contraseña</CardTitle>
                <CardDescription>
                  Ingresa tu email y te enviaremos instrucciones
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-2xl font-display">Bienvenido</CardTitle>
                <CardDescription>
                  Inicia sesión o crea una cuenta para continuar
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {mode === 'reset' ? (
              resetSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <p className="text-lg font-medium">¡Contraseña actualizada!</p>
                  <p className="text-muted-foreground">Redirigiendo al login...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nueva contraseña</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    onClick={handleResetPassword} 
                    className="w-full gradient-primary" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Actualizar contraseña
                  </Button>
                </div>
              )
            ) : mode === 'forgot' ? (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('login')}
                  className="mb-2 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  onClick={handleForgotPassword} 
                  className="w-full gradient-primary" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enviar instrucciones
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
                  <TabsTrigger value="signup">Registrarse</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmit('signin'); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Contraseña</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full gradient-primary" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Iniciar sesión
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-muted-foreground"
                      onClick={() => setMode('forgot')}
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmit('signup'); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Contraseña</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full gradient-primary" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Crear cuenta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-primary-foreground">{title}</h3>
        <p className="text-primary-foreground/70 text-sm">{description}</p>
      </div>
    </div>
  );
}