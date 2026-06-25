
-- ============================================================
-- Fix 4: Multi-tenancy estricta en document_chunks vía user_id
-- ============================================================

-- 1) Añadir columna user_id (nullable mientras backfill)
ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2) Backfill desde el documento padre
UPDATE public.document_chunks dc
SET user_id = d.user_id
FROM public.documents d
WHERE dc.document_id = d.id
  AND dc.user_id IS NULL;

-- 3) NOT NULL + FK + índice
ALTER TABLE public.document_chunks
  ALTER COLUMN user_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.document_chunks
    ADD CONSTRAINT document_chunks_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id
  ON public.document_chunks(user_id);

-- 4) Trigger: forzar que user_id coincida con el dueño del documento padre
CREATE OR REPLACE FUNCTION public.enforce_chunk_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc_owner uuid;
BEGIN
  SELECT user_id INTO doc_owner FROM public.documents WHERE id = NEW.document_id;
  IF doc_owner IS NULL THEN
    RAISE EXCEPTION 'Parent document % does not exist', NEW.document_id;
  END IF;
  NEW.user_id := doc_owner;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_chunk_owner ON public.document_chunks;
CREATE TRIGGER trg_enforce_chunk_owner
BEFORE INSERT OR UPDATE ON public.document_chunks
FOR EACH ROW EXECUTE FUNCTION public.enforce_chunk_owner();

-- 5) Reemplazar políticas: comprobación directa por user_id (más rápida y simple)
DROP POLICY IF EXISTS "Users can view own chunks"   ON public.document_chunks;
DROP POLICY IF EXISTS "Users can create own chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can update own chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can delete own chunks" ON public.document_chunks;

CREATE POLICY "chunks_select_own"
  ON public.document_chunks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "chunks_insert_own"
  ON public.document_chunks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "chunks_update_own"
  ON public.document_chunks FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "chunks_delete_own"
  ON public.document_chunks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- Fix 3: HNSW en lugar de IVFFlat para mejor recall
-- ============================================================
DROP INDEX IF EXISTS public.idx_document_chunks_embedding;

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
