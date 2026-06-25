## Plan: Memoria conversacional + ajuste UI

### 1. Ajuste rápido — Logo en Analytics
En `src/pages/Analytics.tsx`, aumentar la altura del logo de `h-8` a `h-12` para mejorar visibilidad.

### 2. Memoria conversacional por hilo
Implementar un sistema de memoria de largo plazo para que el chatbot mantenga contexto entre mensajes sin saturar el modelo de lenguaje.

#### Tablas nuevas
- `conversation_threads` — un hilo por sesión de chat (campos: `id`, `project_id`, `user_id`, `title`, `summary`, `message_count`, `created_at`, `updated_at`).
- `thread_messages` — mensajes individuales dentro de un hilo (campos: `id`, `thread_id`, `role`, `content`, `tokens_used`, `created_at`).

#### Lógica de resumen
- Cuando un hilo alcanza N mensajes (umbral configurable, ej. 10), la edge function `rag-chat` genera un resumen de la conversación con Gemini Flash.
- El resumen se guarda en `conversation_threads.summary`.
- En llamadas subsiguientes, el sistema prompt incluye el resumen + los últimos 3 mensajes como contexto de ventana corta, descartando el historial intermedio.

#### Cambios en edge function `rag-chat`
- Aceptar un `thread_id` opcional.
- Si existe: recuperar resumen + últimos mensajes; inyectarlos en el system prompt.
- Si no existe: crear un nuevo hilo implícito y devolver su `thread_id`.
- Emitir `thread_id` en el evento final del SSE para que el frontend lo reutilice.

#### Cambios en frontend
- `ChatInterface.tsx`: almacenar `thread_id` en estado local; pasarlo en cada petición.
- Listado de hilos previos en la sidebar del chat (o panel lateral).
- Botón "Nueva conversación" para reiniciar `thread_id`.

#### Rate limiting / tiers
- Los límites de queries mensuales ya existentes (`user_subscriptions`) cubren el uso de hilos (cada mensaje cuenta como 1 query).

### 3. RLS y seguridad
- `conversation_threads`: usuarios solo ven/actualizan sus propios hilos (`user_id = auth.uid()`).
- `thread_messages`: acceso solo a mensajes de hilos propios (via join a `conversation_threads`).
- Ambas tablas con `GRANT` a `authenticated` y `service_role`.

### 4. Tests
- Verificar que `thread_id` persiste entre mensajes.
- Verificar que el resumen se genera tras el umbral configurado.
