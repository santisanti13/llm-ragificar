import { useCallback, useState } from "react";
import { StripeEmbeddedCheckoutInline } from "@/components/StripeEmbeddedCheckout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CheckoutOptions {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
  planLabel?: string;
}

export function useStripeCheckout() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CheckoutOptions | null>(null);

  const openCheckout = useCallback((opts: CheckoutOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const checkoutElement = (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? closeCheckout() : null)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {options?.planLabel ? `Suscribirse · ${options.planLabel}` : "Completar pago"}
          </DialogTitle>
        </DialogHeader>
        {isOpen && options && (
          <StripeEmbeddedCheckoutInline
            priceId={options.priceId}
            quantity={options.quantity}
            returnUrl={options.returnUrl}
          />
        )}
      </DialogContent>
    </Dialog>
  );

  return { openCheckout, closeCheckout, isOpen, checkoutElement };
}
