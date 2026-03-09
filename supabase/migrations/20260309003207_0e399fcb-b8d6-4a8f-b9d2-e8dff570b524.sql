-- Crear enum para los tiers de suscripción
CREATE TYPE public.subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');

-- Crear tabla de suscripciones de usuario  
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_subscriptions
CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.user_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Función para obtener los límites del tier
CREATE OR REPLACE FUNCTION public.get_tier_limits(tier_name subscription_tier)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT 
    CASE tier_name
      WHEN 'free' THEN '{"projects": 1, "queries_per_month": 100, "max_file_size_mb": 5}'::jsonb
      WHEN 'starter' THEN '{"projects": 5, "queries_per_month": 10000, "max_file_size_mb": 100}'::jsonb  
      WHEN 'pro' THEN '{"projects": 50, "queries_per_month": 100000, "max_file_size_mb": 1024}'::jsonb
      WHEN 'enterprise' THEN '{"projects": -1, "queries_per_month": -1, "max_file_size_mb": -1}'::jsonb
      ELSE '{"projects": 1, "queries_per_month": 100, "max_file_size_mb": 5}'::jsonb
    END;
$$;

-- Función para verificar si el usuario puede crear un proyecto
CREATE OR REPLACE FUNCTION public.can_user_create_project(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_tier AS (
    SELECT COALESCE(us.tier, 'free'::subscription_tier) as tier
    FROM user_subscriptions us 
    WHERE us.user_id = user_uuid
    UNION ALL
    SELECT 'free'::subscription_tier
    LIMIT 1
  ),
  tier_limits AS (
    SELECT (get_tier_limits(ut.tier)->>'projects')::int as max_projects
    FROM user_tier ut
  ),
  current_projects AS (
    SELECT COUNT(*)::int as project_count
    FROM projects p
    WHERE p.user_id = user_uuid
  )
  SELECT 
    CASE 
      WHEN tl.max_projects = -1 THEN true  -- unlimited
      ELSE cp.project_count < tl.max_projects
    END
  FROM tier_limits tl, current_projects cp;
$$;

-- Función para verificar límite mensual de queries
CREATE OR REPLACE FUNCTION public.can_user_make_query(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE  
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_tier AS (
    SELECT COALESCE(us.tier, 'free'::subscription_tier) as tier
    FROM user_subscriptions us 
    WHERE us.user_id = user_uuid
    UNION ALL
    SELECT 'free'::subscription_tier
    LIMIT 1
  ),
  tier_limits AS (
    SELECT (get_tier_limits(ut.tier)->>'queries_per_month')::int as max_queries
    FROM user_tier ut
  ),
  current_month_queries AS (
    SELECT COUNT(*)::int as query_count
    FROM api_query_logs aql
    WHERE aql.user_id = user_uuid
    AND aql.created_at >= date_trunc('month', now())
    AND aql.status = 'success'
  )
  SELECT 
    CASE 
      WHEN tl.max_queries = -1 THEN true  -- unlimited
      ELSE cmq.query_count < tl.max_queries
    END
  FROM tier_limits tl, current_month_queries cmq;
$$;

-- Función para obtener estadísticas de uso del usuario
CREATE OR REPLACE FUNCTION public.get_user_usage_stats(user_uuid uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_tier AS (
    SELECT COALESCE(us.tier, 'free'::subscription_tier) as tier
    FROM user_subscriptions us 
    WHERE us.user_id = user_uuid
    UNION ALL
    SELECT 'free'::subscription_tier
    LIMIT 1
  ),
  current_usage AS (
    SELECT 
      COUNT(DISTINCT p.id) as projects_used,
      (SELECT COUNT(*) FROM api_query_logs aql 
       WHERE aql.user_id = user_uuid 
       AND aql.created_at >= date_trunc('month', now())
       AND aql.status = 'success') as queries_this_month,
      COALESCE(SUM(d.file_size), 0) as total_storage_bytes
    FROM projects p
    LEFT JOIN documents d ON d.project_id = p.id
    WHERE p.user_id = user_uuid
  )
  SELECT jsonb_build_object(
    'tier', ut.tier,
    'limits', get_tier_limits(ut.tier),
    'usage', jsonb_build_object(
      'projects', cu.projects_used,
      'queries_this_month', cu.queries_this_month, 
      'storage_mb', ROUND(cu.total_storage_bytes / 1048576.0, 2)
    )
  )
  FROM user_tier ut, current_usage cu;
$$;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();