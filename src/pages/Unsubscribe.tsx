import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const Unsubscribe = () => {
  const [state, setState] = useState<"loading" | "valid" | "already" | "invalid" | "done" | "error">(
    "loading"
  );
  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await r.json();
        if (data.valid === true) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error || !data?.success) setState("error");
    else setState("done");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <h1 className="text-2xl mb-4" style={{ fontFamily: "Lora, serif" }}>
          Cancelar suscripción
        </h1>
        {state === "loading" && <p className="text-muted-foreground">Validando enlace…</p>}
        {state === "valid" && (
          <>
            <p className="text-muted-foreground mb-6">
              Confirma que quieres dejar de recibir emails de RAGify.
            </p>
            <Button onClick={confirm}>Confirmar baja</Button>
          </>
        )}
        {state === "done" && <p className="text-foreground">Te has dado de baja correctamente.</p>}
        {state === "already" && (
          <p className="text-muted-foreground">Esta dirección ya estaba dada de baja.</p>
        )}
        {state === "invalid" && (
          <p className="text-destructive">Enlace inválido o expirado.</p>
        )}
        {state === "error" && (
          <p className="text-destructive">Ocurrió un error. Inténtalo más tarde.</p>
        )}
      </Card>
    </div>
  );
};

export default Unsubscribe;
