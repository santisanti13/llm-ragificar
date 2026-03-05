ALTER TABLE public.project_training
  ADD COLUMN IF NOT EXISTS temperature double precision DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS similarity_threshold double precision DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS match_count integer DEFAULT 8,
  ADD COLUMN IF NOT EXISTS chunk_size integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS chunk_overlap integer DEFAULT 200,
  ADD COLUMN IF NOT EXISTS model text DEFAULT 'google/gemini-2.5-flash';