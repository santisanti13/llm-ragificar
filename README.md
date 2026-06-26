# RAGify — RAG-as-a-Service con API, MCP y voz

> Convierte tus documentos en una base de conocimiento privada con API, chat, asistente de voz y servidor MCP.

**Live:** [llm-ragificar.lovable.app](https://llm-ragificar.lovable.app)

> ⚠️ **Nota de seguridad:** el repositorio no incluye `.env.example` y el archivo `.env` actual contiene credenciales reales del proyecto. **No lo commitees**. Si vas a trabajar en equipo, crea manualmente un `.env.example` a partir de las tablas de este documento.

---

## 1. Qué es RAGify

RAGify es una plataforma de **Retrieval-Augmented Generation (RAG)** como servicio. El usuario sube documentos, el sistema los divide en fragmentos, genera embeddings y permite hacer preguntas en lenguaje natural obteniendo respuestas fundamentadas en el propio contenido.

### Funcionalidades principales

- **Ingesta multi-formato:** PDF, TXT, MD, JSON, CSV, HTML, XML, YAML y code files.
- **Chunking recursivo:** párrafo → oración → palabra, con solapamiento y respeto de límites de palabra.
- **Búsqueda híbrida:** pgvector (HNSW, similitud coseno) + Full-Text Search (español/inglés) fusionados con RRF.
- **Embeddings:** Gemini `gemini-embedding-001` (768-dim) vía Lovable AI Gateway.
- **Chat con memoria:** hilos de conversación, ventana deslizante y resúmenes cada 10 turnos.
- **API pública por proyecto:** autenticación con API key (`x-api-key` o `Authorization: Bearer`).
- **Servidor MCP:** cada proyecto expone `search_knowledge`, `ask` y `list_documents` para Claude/Cursor.
- **Asistente de voz:** STT/TTS y conversación WebRTC con ElevenLabs.
- **Monetización:** planes Free / Starter / Pro / Enterprise con Stripe (Embedded Checkout + portal).
- **Blog automatizado:** generación de posts técnicos cada 12 h con Gemini y envío por email.

---

## 2. Arquitectura

```
Usuario (Landing / Dashboard / API / MCP)
                │
                ▼
        React + Vite + shadcn/ui
                │
                ▼
      Supabase Edge Functions (Deno)
                │
                ├── process-document  ──► OCR/txt + chunking + embeddings
                ├── rag-chat          ──► chat SSE con memoria
                ├── api-query         ──► API pública con rate limiting
                ├── mcp-server        ──► JSON-RPC por proyecto
                ├── create-checkout   ──► Stripe checkout
                ├── payments-webhook  ──► sincroniza suscripciones
                ├── generate-blog-post ──► posts automáticos
                └── tts-blog / voice-* / demo-rag …
                │
                ▼
      PostgreSQL + pgvector + HNSW + GIN FTS
```

---

## 3. Requisitos previos

- **Node.js** 18+ (solo para compatibilidad con algunos tools)
- **Bun** 1.0+ (gestor de paquetes principal del proyecto)
- **Supabase CLI** 1.200+ (para funciones y migraciones locales)
- **Deno** 1.40+ (runtime de las Edge Functions)
- Cuenta de **Lovable** con proyecto conectado a Supabase
- Cuenta de **Stripe** (sandbox al menos) para pagos

---

## 4. Instalación local

### 4.1 Clonar el repositorio

```bash
git clone https://github.com/santisanti13/llm-ragificar.git
cd llm-ragificar
```

### 4.2 Instalar dependencias

```bash
bun install
```

> Si usas `npm`, los scripts siguen siendo `npm run <script>`, pero el proyecto utiliza `bun.lock` como fuente de verdad de bloqueo.

### 4.3 Inicializar Supabase local

```bash
supabase login
supabase init        # si no existe .supabase/
supabase start
```

Esto levanta PostgreSQL, el studio local, el auth service y el functions server.

---

## 5. Variables de entorno

### 5.1 Frontend (`VITE_*`)

Crear `.env` en la raíz del proyecto:

```bash
VITE_SUPABASE_PROJECT_ID="tu-project-id"
VITE_SUPABASE_URL="https://tu-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="tu-anon-key"
VITE_PAYMENTS_CLIENT_TOKEN="pk_test_..."     # Stripe publishable key
```

Estas variables se inyectan en el build de Vite. **Nunca subas `.env` a Git** (ya está en `.gitignore`).

### 5.2 Edge Functions (runtime secrets)

Las Edge Functions leen el entorno de Supabase. En local, se inyectan desde `supabase/config.toml` o `supabase secrets`. En producción se configuran desde el dashboard de Lovable o con la CLI:

```bash
supabase secrets set LOVABLE_API_KEY=lovable_xxx
supabase secrets set SUPABASE_URL=https://tu-project-id.supabase.co
supabase secrets set SUPABASE_ANON_KEY=tu-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
supabase secrets set ELEVENLABS_API_KEY=sk_xxx
supabase secrets set ELEVENLABS_AGENT_ID=xxx
supabase secrets set STRIPE_SANDBOX_API_KEY=sk_test_xxx
supabase secrets set STRIPE_LIVE_API_KEY=sk_live_xxx
supabase secrets set PAYMENTS_SANDBOX_WEBHOOK_SECRET=whsec_xxx
supabase secrets set PAYMENTS_LIVE_WEBHOOK_SECRET=whsec_xxx
```

### 5.3 Resumen de variables requeridas

| Variable | Usada en | Obligatoria | Notas |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Sí | URL del proyecto Supabase. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Sí | `anon` key. |
| `VITE_PAYMENTS_CLIENT_TOKEN` | Frontend | Sí | Stripe publishable key (sandbox o live). |
| `SUPABASE_URL` | Edge Functions | Sí | Igual que `VITE_SUPABASE_URL`. |
| `SUPABASE_ANON_KEY` | Edge Functions | Sí | Para autenticación de usuarios. |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Sí | Para operaciones administrativas (bypass RLS). |
| `LOVABLE_API_KEY` | Edge Functions | Sí | Acceso a Lovable AI Gateway (chat, embeddings, TTS, STT). |
| `ELEVENLABS_API_KEY` | elevenlabs-conversation-token | Sí | Si usas agente de voz. |
| `ELEVENLABS_AGENT_ID` | elevenlabs-conversation-token | Sí | ID del agente conversacional. |
| `STRIPE_SANDBOX_API_KEY` | create-checkout, payments-webhook | Sí para pagos | O también `STRIPE_LIVE_API_KEY`. |
| `PAYMENTS_SANDBOX_WEBHOOK_SECRET` | payments-webhook | Sí para webhooks | O también `PAYMENTS_LIVE_WEBHOOK_SECRET`. |
| `SUPABASE_JWKS` | demo-rag | No | Sal usada para hashear IPs de demo. |

---

## 6. Comandos para ejecutar el RAG y el frontend

### 6.1 Frontend

```bash
bun run dev
```

La app se sirve en `http://localhost:8080` (host `::`, puerto 8080).

### 6.2 Build de producción

```bash
bun run build
bun run preview      # sirve el build localmente
```

### 6.3 Lint

```bash
bun run lint
```

### 6.4 Edge Functions

#### Ejecutar una función localmente

```bash
supabase functions serve api-query --env-file .env.local
```

Crea un `.env.local` con las variables del backend:

```bash
SUPABASE_URL=https://tu-project-id.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
LOVABLE_API_KEY=lovable_xxx
ELEVENLABS_API_KEY=sk_xxx
ELEVENLABS_AGENT_ID=xxx
STRIPE_SANDBOX_API_KEY=sk_test_xxx
PAYMENTS_SANDBOX_WEBHOOK_SECRET=whsec_xxx
```

#### Desplegar todas las funciones

```bash
supabase functions deploy
```

#### Desplegar una función concreta

```bash
supabase functions deploy api-query
```

### 6.5 Migraciones de base de datos

```bash
# Aplicar migraciones pendientes en el proyecto remoto
supabase db push

# Generar una nueva migración desde cambios locales
supabase db diff -f nueva_feature
```

### 6.6 Probar el pipeline de RAG

1. Levanta el frontend: `bun run dev`.
2. Regístrate e inicia sesión.
3. Crea un proyecto desde el dashboard.
4. Sube un documento en la pestaña **Conocimiento**.
5. Espera a que el estado pase a `indexed` (se invoca `process-document`).
6. Ve a la pestaña **Chat** y haz una pregunta sobre el documento.

Alternativamente, prueba la API directamente:

```bash
curl -X POST https://tu-project-id.supabase.co/functions/v1/api-query \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-api-key" \
  -d '{"project_id":"tu-project-id","query":"¿Qué dice el documento sobre...?"}'
```

### 6.7 Probar el servidor MCP

Configura Claude/Cursor con la URL del proyecto:

```json
{
  "mcpServers": {
    "ragify-mi-proyecto": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-remote",
        "https://tu-project-id.supabase.co/functions/v1/mcp-server/tu-project-id"
      ],
      "env": {
        "API_KEY": "tu-project-api-key"
      }
    }
  }
}
```

O usa la URL directa con `Authorization: Bearer <api-key>`.

---

## 7. Flujo de trabajo RAG detallado

### 7.1 Ingesta de documentos (`process-document`)

1. Recibe `{ documentId }` autenticado con JWT.
2. Descarga el archivo desde Supabase Storage.
3. Extrae texto según el formato:
   - **PDF**: Gemini con visión sobre el PDF en base64.
   - **Texto plano**: lectura directa.
   - **JSON/CSV/YAML/XML**: normalización a texto legible.
4. Limpia el texto y aplica chunking recursivo.
5. Genera embeddings por lotes de 20 vía Lovable AI Gateway (`google/gemini-embedding-001`, 768 dim).
6. Inserta los chunks en `document_chunks` con `user_id` y vector.
7. Actualiza `documents.status` a `indexed` o `error`.

### 7.2 Recuperación (`rag-chat` / `api-query`)

1. Valida autenticación (JWT de usuario o API key).
2. Valida límites del tier (`can_user_make_query`).
3. Genera embedding de la consulta.
4. Ejecuta en paralelo:
   - `match_document_chunks` (semantic, HNSW, coseno).
   - `search_document_chunks_fts` (full-text, español/inglés).
5. Fusiona resultados con RRF y filtra por `similarity_threshold`.
6. Corta el contexto si supera el presupuesto de tokens (70 % del contexto del modelo).
7. Construye el prompt con citas `[1]`, `[2]` y ejemplos de entrenamiento.
8. Genera respuesta con temperatura 0.2 (por defecto).
9. Si no hay contexto relevante, responde con el mensaje corto de "no encontré información".
10. Guarda métricas en `api_query_logs` o `thread_messages`.

### 7.3 Memoria conversacional

- Cada hilo se almacena en `conversation_threads`.
- Se guardan los últimos 6 mensajes en `thread_messages`.
- Cada 10 turnos se genera un resumen y se vacían mensajes antiguos.

---

## 8. Edge Functions disponibles

| Función | Auth | Descripción |
|---|---|---|
| `api-query` | API key | Endpoint público del RAG. Rate limit 100 req/min. |
| `rag-chat` | JWT | Chat SSE con memoria y citas. |
| `process-document` | JWT | Ingesta y chunking de documentos. |
| `reprocess-project` | JWT | Reprocesa todos los documentos de un proyecto. |
| `generate-questions` | JWT | Genera 5 Q&A de entrenamiento por documento. |
| `mcp-server` | API key | Servidor MCP JSON-RPC por proyecto. |
| `demo-rag` | Anónimo | Demo pública de la landing (5 usos/IP/día). |
| `create-checkout` | JWT | Crea sesión de Stripe Embedded Checkout. |
| `create-portal-session` | JWT | Redirige al portal de facturación de Stripe. |
| `payments-webhook` | Stripe signature | Recibe eventos de Stripe. |
| `generate-blog-post` | service_role / cron | Genera posts de blog cada 12 h. |
| `tts-blog` | JWT | TTS de post para el reproductor de audio. |
| `send-transactional-email` | JWT | Envía emails transaccionales. |
| `process-email-queue` | service_role | Procesa colas de emails vía `pgmq`. |
| `elevenlabs-conversation-token` | JWT | Token para WebRTC de ElevenLabs. |
| `voice-stt` | JWT | Speech-to-text vía Lovable AI Gateway. |
| `voice-tts` | JWT | Text-to-speech vía Lovable AI Gateway. |
| `handle-email-suppression` | service_role | Maneja bounces/complaints. |
| `handle-email-unsubscribe` | token | Desuscribe emails. |
| `preview-transactional-email` | JWT | Vista previa de plantillas de email. |

---

## 9. Estructura del proyecto

```
llm-ragificar/
├── public/                     # Assets estáticos (logo, video, etc.)
├── src/
│   ├── assets/                 # Imágenes y logos
│   ├── components/             # Componentes React (shadcn/ui + custom)
│   ├── hooks/                  # Custom hooks (React Query, Stripe, etc.)
│   ├── integrations/supabase/  # Cliente Supabase auto-generado
│   ├── lib/                    # Utilidades, helpers, stripe.ts
│   ├── pages/                  # Páginas de la app (Index, Dashboard, Project, Blog, etc.)
│   ├── App.tsx                 # Router y layout
│   └── main.tsx                # Entry point
├── supabase/
│   ├── functions/              # Edge Functions (Deno)
│   ├── migrations/             # Migraciones SQL de PostgreSQL
│   └── config.toml             # Configuración de Supabase CLI
├── .env                        # Variables de entorno frontend (no commitear)
├── .env.development            # Variables de desarrollo
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## 10. Configuración adicional

### 10.1 Google OAuth

El proyecto usa `@lovable.dev/cloud-auth-js`. Para desarrollo local, asegúrate de que la URL `http://localhost:8080` esté en los **Authorized redirect URIs** del proveedor de Google en Supabase Auth.

### 10.2 Stripe

1. Crea productos y precios en Stripe con `lookup_key`:
   - `starter_monthly`, `starter_yearly`
   - `pro_monthly`, `pro_yearly`
   - `enterprise_monthly`, `enterprise_yearly`
2. Configura el webhook apuntando a:
   ```
   https://tu-project-id.supabase.co/functions/v1/payments-webhook?env=sandbox
   ```
3. Añade el webhook secret a las variables de entorno.

### 10.3 Email

El dominio remitente es `notify.tikshoptok.com`. La infraestructura de email (`pgmq`, `pg_net`, `pg_cron`, `supabase_vault`) se gestiona automáticamente con las migraciones. Asegúrate de que `process-email-queue` tenga `verify_jwt = true` y de que el job de `pg_cron` llame al edge function con la service role key.

### 10.4 Blog automático

El job `generate-blog-post` se ejecuta cada 12 horas vía `pg_cron`. El destinatario fijo está configurado en `generate-blog-post/index.ts` como `santiagojimenezvalero@gmail.com`. Para cambiarlo, modifica la constante `NOTIFY_EMAIL` y vuelve a desplegar.

---

## 11. Testing

```bash
# Tests unitarios con Vitest
bunx vitest run

# UI de tests
bunx vitest --ui
```

### 11.1 Test cards de Stripe

Para probar el checkout en sandbox, usa:

- **Tarjeta exitosa:** `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC.
- **Tarjeta que requiere 3D Secure:** `4000 0025 0000 3155`.
- **Tarjeta rechazada:** `4000 0000 0000 0002`.

---

## 12. Solución de problemas

### 12.1 `Error: LOVABLE_API_KEY not configured`

Configura el secreto en Supabase:

```bash
supabase secrets set LOVABLE_API_KEY=lovable_xxx
```

Y en local añádelo a `.env.local` o pásalo con `--env-file`.

### 12.2 Embeddings con dimensión incorrecta

La columna `document_chunks.embedding` es `vector(768)`. Si ves errores de dimensión, reprocesa el proyecto:

```bash
curl -X POST https://tu-project-id.supabase.co/functions/v1/reprocess-project \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<id>","only_failed":false}'
```

### 12.3 CORS en funciones

Todas las funciones exponen CORS con `Access-Control-Allow-Origin: *`. En producción, si usas un dominio personalizado, considera restringir el origen.

### 12.4 Límites de uso no aplicados

Comprueba que `user_subscriptions` tenga el tier correcto y que las funciones `can_user_make_query` y `get_user_usage_stats` estén creadas. Si usas Stripe, verifica que el webhook haya llegado y que `user_subscriptions` se haya actualizado.

---

## 13. Autor

Built by **Santi** — SaaS builder, EdTech & GovTech.
- Web: [santiagojimenezvalero.com](https://www.santiagojimenezvalero.com)
- LinkedIn: [linkedin.com/in/santijiménezvalero](https://www.linkedin.com/in/santijiménezvalero)
