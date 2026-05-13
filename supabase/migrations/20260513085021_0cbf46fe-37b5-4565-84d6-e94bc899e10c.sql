
-- Add UPDATE policy on document_chunks for symmetric RLS
CREATE POLICY "Users can update own chunks"
ON public.document_chunks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_chunks.document_id
      AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_chunks.document_id
      AND d.user_id = auth.uid()
  )
);

-- Add UPDATE policy on documents storage bucket
CREATE POLICY "Users can update own documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Switch search_document_chunks_fts to SECURITY INVOKER so RLS applies
CREATE OR REPLACE FUNCTION public.search_document_chunks_fts(
  search_query text,
  search_project_id uuid,
  max_results integer DEFAULT 10
)
RETURNS TABLE(id uuid, content text, document_id uuid, chunk_index integer, rank real)
LANGUAGE sql
STABLE
SECURITY INVOKER
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
