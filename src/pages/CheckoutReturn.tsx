import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
        <h1 className="text-3xl font-bold">¡Suscripción activada!</h1>
        <p className="text-muted-foreground">
          {sessionId
            ? "Tu pago se ha procesado correctamente. Ya puedes empezar a usar tu plan."
            : "No se encontró información de la sesión."}
        </p>
        {sessionId && (
          <p className="text-xs font-mono text-muted-foreground break-all">
            Sesión: {sessionId}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link to="/dashboard">Ir al dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
