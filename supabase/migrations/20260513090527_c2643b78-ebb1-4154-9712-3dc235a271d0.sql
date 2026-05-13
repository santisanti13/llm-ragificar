-- 1. get_tier_limits: fijar search_path
CREATE OR REPLACE FUNCTION public.get_tier_limits(tier_name subscription_tier)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT 
    CASE tier_name
      WHEN 'free' THEN '{"projects": 1, "queries_per_month": 100, "max_file_size_mb": 5}'::jsonb
      WHEN 'starter' THEN '{"projects": 5, "queries_per_month": 10000, "max_file_size_mb": 100}'::jsonb  
      WHEN 'pro' THEN '{"projects": 50, "queries_per_month": 100000, "max_file_size_mb": 1024}'::jsonb
      WHEN 'enterprise' THEN '{"projects": -1, "queries_per_month": -1, "max_file_size_mb": -1}'::jsonb
      ELSE '{"projects": 1, "queries_per_month": 100, "max_file_size_mb": 5}'::jsonb
    END;
$function$;

-- 2. can_user_create_project -> SECURITY INVOKER, usa auth.uid()
CREATE OR REPLACE FUNCTION public.can_user_create_project(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  WITH effective_user AS (
    SELECT COALESCE(auth.uid(), user_uuid) AS uid
  ),
  user_tier AS (
    SELECT COALESCE(us.tier, 'free'::subscription_tier) as tier
    FROM effective_user eu
    LEFT JOIN user_subscriptions us ON us.user_id = eu.uid
  ),
  tier_limits AS (
    SELECT (get_tier_limits(ut.tier)->>'projects')::int as max_projects
    FROM user_tier ut
  ),
  current_projects AS (
    SELECT COUNT(*)::int as project_count
    FROM projects p, effective_user eu
    WHERE p.user_id = eu.uid
  )
  SELECT 
    CASE 
      WHEN tl.max_projects = -1 THEN true
      ELSE cp.project_count < tl.max_projects
    END
  FROM tier_limits tl, current_projects cp;
$function$;

-- 3. can_user_make_query -> SECURITY INVOKER, usa auth.uid()
CREATE OR REPLACE FUNCTION public.can_user_make_query(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  WITH effective_user AS (
    SELECT COALESCE(auth.uid(), user_uuid) AS uid
  ),
  user_tier AS (
    SELECT COALESCE(us.tier, 'free'::subscription_tier) as tier
    FROM effective_user eu
    LEFT JOIN user_subscriptions us ON us.user_id = eu.uid
  ),
  tier_limits AS (
    SELECT (get_tier_limits(ut.tier)->>'queries_per_month')::int as max_queries
    FROM user_tier ut
  ),
  current_month_queries AS (
    SELECT COUNT(*)::int as query_count
    FROM api_query_logs aql, effective_user eu
    WHERE aql.user_id = eu.uid
      AND aql.created_at >= date_trunc('month', now())
      AND aql.status = 'success'
  )
  SELECT 
    CASE 
      WHEN tl.max_queries = -1 THEN true
      ELSE cmq.query_count < tl.max_queries
    END
  FROM tier_limits tl, current_month_queries cmq;
$function$;

-- 4. get_user_usage_stats -> SECURITY INVOKER, usa auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_usage_stats(user_uuid uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  WITH effective_user AS (
    SELECT COALESCE(auth.uid(), user_uuid) AS uid
  ),
  user_tier AS (
    SELECT COALESCE(us.tier, 'free'::subscription_tier) as tier
    FROM effective_user eu
    LEFT JOIN user_subscriptions us ON us.user_id = eu.uid
  ),
  current_usage AS (
    SELECT 
      COUNT(DISTINCT p.id) as projects_used,
      (SELECT COUNT(*) FROM api_query_logs aql, effective_user eu2
       WHERE aql.user_id = eu2.uid 
       AND aql.created_at >= date_trunc('month', now())
       AND aql.status = 'success') as queries_this_month,
      COALESCE(SUM(d.file_size), 0) as total_storage_bytes
    FROM effective_user eu
    LEFT JOIN projects p ON p.user_id = eu.uid
    LEFT JOIN documents d ON d.project_id = p.id
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
$function$;

-- 5. update_updated_at_column -> SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 6. api_key_rate_limits: política explícita que bloquea acceso desde el cliente
CREATE POLICY "No client access to rate limits"
ON public.api_key_rate_limits
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);