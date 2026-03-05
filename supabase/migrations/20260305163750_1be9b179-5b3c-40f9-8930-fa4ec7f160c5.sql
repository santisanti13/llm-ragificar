
-- Add full-text search column to document_chunks
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON document_chunks USING gin(fts);

-- Create a full-text search function as alternative to semantic search
CREATE OR REPLACE FUNCTION public.search_document_chunks_fts(
  search_query text,
  search_project_id uuid,
  max_results integer DEFAULT 10
)
RETURNS TABLE(id uuid, content text, document_id uuid, chunk_index integer, rank real)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    dc.id,
    dc.content,
    dc.document_id,
    dc.chunk_index,
    ts_rank(dc.fts, plainto_tsquery('spanish', search_query)) AS rank
  FROM document_chunks dc
  WHERE dc.project_id = search_project_id
    AND dc.fts @@ plainto_tsquery('spanish', search_query)
  ORDER BY rank DESC
  LIMIT max_results;
$$;
