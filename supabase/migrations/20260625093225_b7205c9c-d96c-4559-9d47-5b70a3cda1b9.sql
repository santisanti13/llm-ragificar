
CREATE TABLE public.demo_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ip_hash, day)
);
GRANT ALL ON public.demo_usage TO service_role;
ALTER TABLE public.demo_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_usage deny all to non-service" ON public.demo_usage FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE INDEX idx_demo_usage_day ON public.demo_usage(day);
