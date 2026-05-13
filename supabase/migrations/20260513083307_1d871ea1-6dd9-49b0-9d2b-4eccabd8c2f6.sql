
-- Add multilingual FTS column
ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS fts_es tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(content, ''))) STORED;

-- Recreate fts as 'simple' (language-agnostic, no stopword removal)
ALTER TABLE public.document_chunks DROP COLUMN IF EXISTS fts;
ALTER TABLE public.document_chunks
  ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_document_chunks_fts ON public.document_chunks USING GIN(fts);
CREATE INDEX IF NOT EXISTS idx_document_chunks_fts_es ON public.document_chunks USING GIN(fts_es);

-- Hybrid FTS function: simple + spanish
CREATE OR REPLACE FUNCTION public.search_document_chunks_fts(
  search_query text,
  search_project_id uuid,
  max_results integer DEFAULT 10
)
RETURNS TABLE(id uuid, content text, document_id uuid, chunk_index integer, rank real)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH q AS (
    SELECT
      plainto_tsquery('simple', search_query) AS q_simple,
      plainto_tsquery('spanish', search_query) AS q_es
  )
  SELECT
    dc.id,
    dc.content,
    dc.document_id,
    dc.chunk_index,
    GREATEST(
      ts_rank(dc.fts, q.q_simple),
      ts_rank(dc.fts_es, q.q_es)
    ) AS rank
  FROM document_chunks dc, q
  WHERE dc.project_id = search_project_id
    AND (dc.fts @@ q.q_simple OR dc.fts_es @@ q.q_es)
  ORDER BY rank DESC
  LIMIT max_results;
$$;
