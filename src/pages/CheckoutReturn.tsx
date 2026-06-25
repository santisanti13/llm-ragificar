import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tier, setTier] = useState<string | null>(null);
  const [status, setStatus] = useState<"checking" | "ready" | "timeout">("checking");

  useEffect(() => {
    if (authLoading || !user || !sessionId) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      while (!cancelled && attempts < 20) {
        attempts++;
        const { data } = await supabase
          .from("user_subscriptions")
          .select("tier, status")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data && data.tier && data.tier !== "free") {
          if (!cancelled) {
            setTier(data.tier);
            setStatus("ready");
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) setStatus("timeout");
    };
    poll();
    return () => { cancelled = true; };
  }, [user, authLoading, sessionId]);

  useEffect(() => {
    if (status === "ready") {
      const t = setTimeout(() => navigate("/dashboard"), 2000);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        {status === "checking" && (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            <h1 className="text-3xl font-bold">Activando tu plan…</h1>
            <p className="text-muted-foreground">
              Estamos confirmando el pago con Stripe. Esto tarda unos segundos.
            </p>
          </>
        )}
        {status === "ready" && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-3xl font-bold">¡Plan {tier?.toUpperCase()} activado!</h1>
            <p className="text-muted-foreground">Te llevamos al dashboard…</p>
          </>
        )}
        {status === "timeout" && (
          <>
            <AlertCircle className="w-16 h-16 mx-auto text-yellow-500" />
            <h1 className="text-3xl font-bold">Pago recibido</h1>
            <p className="text-muted-foreground">
              Tu pago se ha procesado, pero la activación del plan tarda más de lo normal.
              Refresca el dashboard en un minuto.
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link to="/dashboard">Ir al dashboard</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
