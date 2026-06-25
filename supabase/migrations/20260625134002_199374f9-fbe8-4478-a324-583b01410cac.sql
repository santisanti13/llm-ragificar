
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';

CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_stripe_sub_unique
  ON public.user_subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Mapea price_id de Stripe (lookup_key) a tier interno
CREATE OR REPLACE FUNCTION public.tier_from_price_id(_price_id text)
RETURNS public.subscription_tier
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _price_id IN ('starter_monthly','starter_yearly') THEN 'starter'::public.subscription_tier
    WHEN _price_id IN ('pro_monthly','pro_yearly')         THEN 'pro'::public.subscription_tier
    WHEN _price_id IN ('enterprise_monthly','enterprise_yearly') THEN 'enterprise'::public.subscription_tier
    ELSE 'free'::public.subscription_tier
  END;
$$;

-- Comprueba si una suscripción está activa/dentro de gracia
CREATE OR REPLACE FUNCTION public.has_active_paid_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND tier <> 'free'
      AND (
        (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;
