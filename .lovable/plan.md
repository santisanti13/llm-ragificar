## Plan: Fix completo del pipeline RAG

### Diagnóstico real (verificado en BD)

Bueno, antes de planear lo que ya funciona: he comprobado el estado real y **el plan antiguo en `.lovable/plan.md` está desactualizado**.

Lo que **SÍ funciona** ya:
- ✅ Extracción de PDFs con Gemini multimodal (los chunks tienen texto limpio).
- ✅ Inserción en `document_chunks` (112 chunks en BD).
- ✅ Columna `fts` poblada por trigger.

Lo que **NO funciona** (verificado):
1. **FTS hardcodeado a `'spanish'`** → si el documento está en inglés (caso real: "10 QUESTIONS, 20 MINUTES…") o si la pregunta es en otro idioma que el documento, el `plainto_tsquery('spanish', …)` no matchea nada. La función `search_document_chunks_fts` devuelve 0 filas en muchos casos.
2. **`embedding IS NULL` en el 100% de los chunks** → la búsqueda semántica está muerta. El fallback actual ("traer 10 chunks aleatorios") mete ruido en el prompt y el chat responde mal.
3. **`similarity_threshold` de la config no se usa** (memoria ya lo refleja).

### Cambios

#### 1. Migración SQL — FTS multilenguaje + función híbrida

- Recrear columna `fts` como `to_tsvector('simple', content)` (sin stopwords, language-agnostic) **+** mantener variante en español como columna adicional `fts_es` para queries en castellano. Búsqueda usa `OR` sobre ambas.
- Recrear `search_document_chunks_fts` para hacer match en `fts || fts_es` con `plainto_tsquery('simple', q) || plainto_tsquery('spanish', q)`.
- Backfill automático de las columnas para los 112 chunks existentes.

#### 2. Generación de embeddings reales

- Usar **`google/gemini-embedding-001`** vía Lovable AI Gateway (`/v1/embeddings`, dim 768, ya compatible con la columna `vector(768)`).
- En `process-document/index.ts`: tras chunkear, hacer batch de embeddings (en lotes de 20), e insertar en el mismo `INSERT` con formato pgvector correcto: `[0.1,0.2,…]` como **string**, no array JS.
- Si el endpoint de embeddings falla, loguear pero no romper el processing — los chunks se guardan igual y el FTS sigue funcionando.

#### 3. Búsqueda híbrida en `rag-chat` y `api-query`

Reemplazar el fallback ciego ("primeros 10 chunks") por:
1. Generar embedding de la query.
2. Llamar a `match_document_chunks` (semántica) con `similarity_threshold` configurable.
3. Llamar a `search_document_chunks_fts` (keyword).
4. Fusionar resultados deduplicando por `id`, priorizando los que aparecen en ambos (RRF simple).
5. Solo si **ambos** devuelven 0, mostrar un mensaje claro al modelo: "No hay contexto relevante" (en lugar de inventar con chunks aleatorios).

#### 4. Re-procesar documentos existentes

- Añadir botón "Re-procesar todos" en `Project.tsx` que itere sobre los documentos del proyecto e invoque `process-document` con `force=true` (ya borra chunks viejos y los regenera con embeddings).
- También ejecutar un job server-side al desplegar la migración para repoblar `fts`/`fts_es` de los 112 chunks ya existentes (sin embeddings; los users tendrán que re-procesar para obtener embeddings).

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| nueva migración SQL | columna `fts_es`, recreación `search_document_chunks_fts` híbrida |
| `supabase/functions/process-document/index.ts` | generar embeddings + insertarlos correctamente |
| `supabase/functions/rag-chat/index.ts` | búsqueda híbrida (semántica + FTS) + threshold configurable |
| `supabase/functions/api-query/index.ts` | mismo cambio (paridad con rag-chat) |
| `src/pages/Project.tsx` o `TrainingConfig.tsx` | botón "Re-procesar documentos" |

### Validación post-implementación

1. Subir un PDF de prueba → confirmar que `embedding IS NOT NULL` en los nuevos chunks.
2. Hacer pregunta cuya respuesta esté en el doc → verificar en logs que `chunks_used > 0` y que vienen del FTS o de la semántica (no del fallback).
3. Hacer pregunta totalmente fuera del doc → verificar que el modelo dice "no tengo esa información" en vez de alucinar.

### Notas

- El modelo `google/gemini-embedding-001` está dentro del free tier de Lovable AI durante el período promocional.
- No se toca el sistema de tiers/límites ni la UI de pagos en este plan.
