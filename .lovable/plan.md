
## Plan: Contador de uso semanal + Rate limiting por API key

### Diagnóstico del estado actual

- `ApiKeysManager.tsx` muestra: nombre, estado, prefijo, y última vez usada — pero **no cuántas llamadas ha hecho**
- `api_query_logs` ya registra cada query con `project_id` y `user_id`, pero **no hay columna `api_key_id`** para relacionarla con la key específica que hizo la llamada
- `api-query/index.ts` actualiza `last_used_at` de la key, pero no guarda qué key usó cada log
- No hay ningún mecanismo de rate limiting actualmente

---

### Cambios necesarios

#### 1. Base de datos — 1 migración

```sql
-- Agregar api_key_id a api_query_logs para rastrear qué key hizo cada llamada
ALTER TABLE api_query_logs ADD COLUMN api_key_id uuid REFERENCES project_api_keys(id) ON DELETE SET NULL;

-- Tabla para rate limiting: contador de requests por key por ventana de 1 minuto
CREATE TABLE api_key_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES project_api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE(api_key_id, window_start)
);
```

#### 2. Edge function `api-query/index.ts` — 2 cambios

**A) Rate limiting** — Después de validar la API key, antes de procesar:
```
1. Calcular window_start = floor(now / 60s) * 60s  
2. INSERT INTO api_key_rate_limits ... ON CONFLICT DO UPDATE SET request_count = request_count + 1
3. SELECT request_count WHERE api_key_id = X AND window_start = Y
4. Si request_count > 100 → return 429 con Retry-After header
```

**B) Guardar api_key_id en los logs** — Al insertar en `api_query_logs`:
```
api_key_id: apiKeyRecord.id  ← añadir este campo
```

#### 3. `ApiKeysManager.tsx` — Añadir contador semanal

Al cargar las keys, hacer una segunda query que cuente logs de esta semana agrupados por `api_key_id`:
```typescript
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const { data: counts } = await supabase
  .from('api_query_logs')
  .select('api_key_id, count', { count: 'exact' })
  // group by api_key_id using rpc or manual mapping
```

Mostrar en cada key: `"247 llamadas esta semana"` con un badge de color según volumen.

---

### Diseño UI del contador

```
┌─────────────────────────────────────────────────────────┐
│ Producción                          [Activa]             │
│ rag_...xK9mR2  │  Último uso: 12 mar 2026              │
│ 📊 247 llamadas esta semana  ████░░░░  (límite 100/min) │
│                           [Desactivar]  [🗑]             │
└─────────────────────────────────────────────────────────┘
```

---

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/migrations/` | Nueva migración con `api_key_id` + tabla `api_key_rate_limits` |
| `supabase/functions/api-query/index.ts` | Rate limiting + guardar `api_key_id` en logs |
| `src/components/ApiKeysManager.tsx` | Query de conteo semanal + UI del badge |

---

### Límite de rate limiting

- **100 requests por minuto por API key** (configurable en el futuro por proyecto)
- Respuesta 429 con header `Retry-After: 60` y mensaje claro
- La ventana se resetea cada minuto natural (no sliding window)
