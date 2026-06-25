
CREATE OR REPLACE FUNCTION public.enforce_chunk_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

REVOKE EXECUTE ON FUNCTION public.enforce_chunk_owner() FROM PUBLIC, anon, authenticated;
