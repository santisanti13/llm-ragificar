const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-red-100 border-b border-red-300 px-4 py-2 text-center text-sm text-red-800">
        El checkout en producción no está configurado. Completa la activación de Stripe para aceptar pagos reales.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
        Todos los pagos en la preview son en modo test. Usa tarjeta <span className="font-mono">4242 4242 4242 4242</span>.
      </div>
    );
  }
  return null;
}
