## Plan: Arreglos del servidor MCP + publicación del blog en LinkedIn

### 1. Arreglar `list_documents` (MCP)
La tabla de documentos guarda el nombre en la columna `name`, no en `filename`, y no tiene `mime_type`. El servidor MCP pide columnas que no existen.
- En la función `mcp-server`: cambiar `filename` por `name` en `list_documents` y en `search_knowledge` (que también lo usa para poner nombre a los fragmentos), quitar `mime_type` y añadir `chunk_count`.
- La salida mantiene el campo `filename` para no romper a los clientes que ya lo usan.

### 2. Error 402 de `ask`: "Credits exhausted"
No es OpenAI ni Anthropic: `ask` usa la IA de Lovable, que se paga con los créditos de tu espacio de trabajo. El código está bien; se han acabado los créditos.
- Lo que tienes que hacer tú: recargar en **Settings → Plans & credits** (o subir el límite de gasto de IA si hay uno puesto).
- Mejora del código: que el error muestre el mensaje real que devuelve la IA (en vez de un genérico "Credits exhausted") y se diferencie del 402 de "límite mensual del plan" de RAGify, para que Claude/Cursor enseñen un error claro.
- El blog automático y el chat también gastan estos créditos, así que se pararán hasta que recargues.

### 3. Publicar cada post del blog en la página de LinkedIn de la empresa
- Conectar LinkedIn con el conector de Lovable (verás una tarjeta para iniciar sesión con la cuenta que administra la página "RAG as a Service").
- Al terminar `generate-blog-post`, publicar en la página de empresa (organización 110143162): título, un resumen corto de 2-3 frases, hashtags (#RAG #LLM #MCP #IA) y el enlace al post en `llm-ragificar.lovable.app/blog/<slug>`.
- Guardar en `blog_posts` si se publicó en LinkedIn (`linkedin_post_id`, `linkedin_posted_at`) para no repetir publicaciones.
- Si LinkedIn falla, el post del blog y el email se mantienen; el error queda guardado y no se vuelve a intentar sin parar.

**Aviso importante:** publicar como *página de empresa* requiere el permiso `w_organization_social`, que LinkedIn solo da a apps aprobadas (Community Management API). Si el conector solo tiene permiso para publicar en tu perfil personal (`w_member_social`), hay dos opciones:
- a) publicar en tu perfil personal enlazando a la página, o
- b) que solicites a LinkedIn el acceso a la Community Management API.
Lo comprobaré con los permisos reales de la conexión antes de dar nada por hecho.

### Detalles técnicos
- `mcp-server/index.ts`: `.select("id, name, file_size, status, chunk_count, created_at")`; mapear `filename: d.name`.
- `api-query`: en el 402/403 de la gateway, reenviar el cuerpo con `type: "ai_credits_exhausted"`.
- Migración: `ALTER TABLE blog_posts ADD COLUMN linkedin_post_id text, linkedin_posted_at timestamptz, linkedin_error text`.
- LinkedIn: `POST /rest/posts` vía connector gateway con `author: "urn:li:organization:110143162"`, cabeceras `LinkedIn-Version` y `X-Restli-Protocol-Version: 2.0.0`, artículo con enlace al post.
- Desplegar `mcp-server`, `api-query` y `generate-blog-post`; probar `tools/call list_documents` con la API key.
