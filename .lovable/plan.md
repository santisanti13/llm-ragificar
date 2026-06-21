## Cambios

### 1. Aviso en `TrainingConfig.tsx`
Añadir un `Alert` visible junto a los sliders de **Chunk Size** y **Chunk Overlap** indicando:
> "Estos parámetros solo se aplican al procesar documentos nuevos. Para aplicarlos a documentos existentes, usa 'Reprocesar todos' en la pestaña Documentos."

Incluir un botón directo "Reprocesar documentos" que dispare la misma acción que `handleReprocessAll` de `Project.tsx` (extraer handler o emitir evento / prop callback).

### 2. Aplicar `similarity_threshold` también al ramo FTS

En `supabase/functions/rag-chat/index.ts` y `supabase/functions/api-query/index.ts`:

- Tras el merge de resultados semánticos + FTS, filtrar los chunks cuya `similarity` final sea menor que `similarity_threshold`.
- Para chunks que solo provienen de FTS (sin score semántico), calcular similitud contra el embedding de la query y descartar los que no superen el umbral. Alternativa más simple: normalizar `rank` de FTS a [0,1] y exigir `>= similarity_threshold`.
- Mantener el orden híbrido actual (`1 + similarity + 0.5 + rank`) pero solo entre los que pasan el filtro.

### Archivos afectados
- `src/components/TrainingConfig.tsx` — Alert + botón reprocesar
- `src/pages/Project.tsx` — exponer `handleReprocessAll` a `TrainingConfig` (prop)
- `supabase/functions/rag-chat/index.ts` — filtro umbral en hybrid merge
- `supabase/functions/api-query/index.ts` — mismo filtro

### Validación
- Subir documento, cambiar chunk_size, ver aviso, pulsar reprocesar, confirmar que `chunks` se regeneran.
- Subir umbral a 0.9 y verificar que respuestas irrelevantes dejan de aparecer tanto vía chat como vía API pública.
