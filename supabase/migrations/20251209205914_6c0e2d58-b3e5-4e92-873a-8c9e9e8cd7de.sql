-- Create table for API query logs
CREATE TABLE public.api_query_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  response_preview TEXT,
  tokens_used INTEGER DEFAULT 0,
  latency_ms INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_query_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own query logs"
ON public.api_query_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own query logs"
ON public.api_query_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_api_query_logs_project_id ON public.api_query_logs(project_id);
CREATE INDEX idx_api_query_logs_created_at ON public.api_query_logs(created_at DESC);
CREATE INDEX idx_api_query_logs_user_id ON public.api_query_logs(user_id);