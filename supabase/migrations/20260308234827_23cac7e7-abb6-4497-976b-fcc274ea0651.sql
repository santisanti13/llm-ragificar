-- Agregar api_key_id a api_query_logs
ALTER TABLE public.api_query_logs 
ADD COLUMN IF NOT EXISTS api_key_id uuid REFERENCES public.project_api_keys(id) ON DELETE SET NULL;

-- Crear tabla de rate limits
CREATE TABLE IF NOT EXISTS public.api_key_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid NOT NULL REFERENCES public.project_api_keys(id) ON DELETE CASCADE,
  window_start timestamp with time zone NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE(api_key_id, window_start)
);

-- RLS en api_key_rate_limits
ALTER TABLE public.api_key_rate_limits ENABLE ROW LEVEL SECURITY;