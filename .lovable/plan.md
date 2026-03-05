

# Diagnóstico y Plan de Corrección del RAG

## Problemas Encontrados

### 1. CRITICO: `document_chunks` está completamente vacía
Los documentos muestran `status: ready` y `chunk_count: 40`, pero la tabla `document_chunks` tiene **0 registros**. Los chunks se reportan como procesados pero no se persisten. Probable causa: el formato del embedding (JSON.stringify de un array) no es compatible con el tipo `vector(768)` de pgvector, causando que el INSERT falle silenciosamente.

### 2. CRITICO: La API de embeddings devuelve error 400
Los logs muestran repetidamente `Embedding error: 400` en `rag-chat`. El endpoint `https://ai.gateway.lovable.dev/v1/embeddings` con modelo `text-embedding-3-small` no funciona correctamente. Esto rompe toda la búsqueda semántica.

### 3. PDFs se leen como texto crudo
`process-document` usa `fileData.text()` sobre archivos PDF, que devuelve basura binaria en lugar de texto legible. Los PDFs requieren un parser dedicado.

## Plan de Corrección

### Paso 1: Corregir el procesamiento de PDFs
- Usar la API de Lovable AI (Gemini) para extraer texto de PDFs enviando el contenido base64 como input multimodal, o implementar un parser PDF en Deno (como `pdf-parse`).
- Alternativa más robusta: usar Gemini con el PDF en base64 para extraer el texto.

### Paso 2: Corregir la generación de embeddings
- Reemplazar el endpoint `/v1/embeddings` por una estrategia alternativa:
  - **Opción A**: Usar Gemini para generar embeddings a través del gateway si soporta el modelo `text-embedding-004`.
  - **Opción B**: Generar embeddings usando una llamada al modelo de chat con tool calling para obtener una representación del texto, y usar búsqueda por keywords como respaldo principal.
  - **Opción C (recomendada)**: Mejorar la búsqueda de texto con un enfoque híbrido: búsqueda por keywords (full-text search con `tsvector` en PostgreSQL) como método principal, eliminando la dependencia de embeddings que no funcionan.

### Paso 3: Corregir la persistencia de chunks
- Agregar logging detallado del error de INSERT en `process-document`.
- Si se mantienen embeddings, asegurar que el formato sea compatible con pgvector (pasar como string `[0.1,0.2,...]`).
- Si se usa full-text search, agregar columna `tsv tsvector` a `document_chunks` con trigger de actualización.

### Paso 4: Crear mecanismo de re-procesamiento
- Añadir un botón "Re-procesar" en la UI del proyecto para re-generar chunks de documentos existentes.
- Limpiar chunks antiguos antes de re-insertar.

### Paso 5: Sincronizar `api-query` con los mismos parámetros
- La edge function `api-query` no usa los parámetros configurables (temperatura, modelo, threshold) del `project_training`. Alinearla con `rag-chat`.

## Detalle Técnico

### Migración SQL (full-text search)
```sql
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED;
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON document_chunks USING gin(fts);
```

### Búsqueda híbrida en `rag-chat`
Reemplazar la búsqueda semántica fallida por full-text search de PostgreSQL como método principal, manteniendo la semántica como opcional si los embeddings existen.

### Procesamiento de PDFs
Convertir el PDF a base64 y enviarlo a Gemini Flash para extracción de texto, ya que es multimodal y puede leer PDFs nativamente.

## Archivos a Modificar
- `supabase/functions/process-document/index.ts` — Parser PDF + fix chunks insert
- `supabase/functions/rag-chat/index.ts` — Búsqueda híbrida (FTS + semántica)
- `supabase/functions/api-query/index.ts` — Usar parámetros configurables
- `src/components/TrainingConfig.tsx` o `src/pages/Project.tsx` — Botón re-procesar
- Nueva migración SQL — Columna FTS + índice GIN

