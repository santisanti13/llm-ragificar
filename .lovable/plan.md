

## Copy para RAGify — Destacando la visión del creador

Basado en el análisis de la landing page actual, el producto y sus capacidades, aquí va el copy propuesto. Se puede integrar como una nueva sección "Sobre el producto" en la landing, o usarse como material de marketing independiente.

---

### Headline principal

> **RAGify nació de una frustración real: construir IA sobre tus propios datos no debería requerir un equipo de Machine Learning.**

---

### Copy largo (sección "Manifiesto" o "Sobre RAGify")

> **Cualquiera puede hablar de IA. Pocos la hacen accesible.**
>
> RAGify no es otro wrapper de ChatGPT. Es una plataforma de RAG-as-a-Service diseñada desde cero para resolver un problema que su creador vivió en primera persona: el abismo entre tener documentos llenos de conocimiento valioso y poder consultarlos con lenguaje natural a través de una API.
>
> Construir un sistema RAG en producción normalmente requiere ingenieros de ML, infraestructura de vectores, pipelines de embeddings, orquestación de prompts y semanas de desarrollo. RAGify comprime todo eso en 3 minutos.
>
> **Lo que hace diferente al creador de RAGify:**
>
> — **Obsesión por la simplicidad.** Cada decisión de producto se filtra por una pregunta: "¿Un founder sin equipo técnico podría hacerlo solo?" Si la respuesta es no, se rediseña.
>
> — **Pensamiento API-first.** RAGify no es un chatbot bonito. Es infraestructura. Un endpoint REST que se integra con cualquier stack, cualquier lenguaje, cualquier herramienta no-code. La visión siempre fue: construye la tubería, no el grifo.
>
> — **Seguridad como principio, no como feature.** Documentos encriptados AES-256, aislamiento por proyecto, verificación JWT en cada endpoint, datos que nunca se comparten ni entrenan modelos de terceros. No es un checkbox de marketing — es arquitectura.
>
> — **Full-stack por convicción.** Desde el procesamiento de documentos con OCR hasta el frontend con analíticas en tiempo real, pasando por edge functions, embeddings vectoriales y RLS a nivel de base de datos. RAGify es el producto de alguien que entiende cada capa del stack y no delega la calidad.
>
> — **Velocidad como ventaja competitiva.** Setup en 3 minutos. Latencia menor a 100ms. Deploy instantáneo. Porque el creador sabe que en el mundo real, la velocidad de iteración gana a la perfección teórica.

---

### Copy corto (para redes sociales, pitch decks, bios)

> **RAGify: de documentos a API inteligente en 3 minutos.**
> Creado por un desarrollador full-stack que se cansó de que construir RAG requiriera un equipo de ML. Procesamiento automático de documentos, embeddings vectoriales, entrenamiento sin código y un endpoint REST listo para producción. Seguridad empresarial incluida. Sin DevOps. Sin excusas.

---

### Taglines alternativos

1. "Tu conocimiento. Tu API. Tu control."
2. "RAG en producción, sin el equipo de ML."
3. "Donde tus documentos se convierten en inteligencia."
4. "La infraestructura de IA que deberías haber tenido hace un año."
5. "Sube. Entrena. Despliega. Así de simple."

---

### Plan de implementación

Se puede añadir una nueva sección **"Por qué RAGify"** en `src/pages/Index.tsx` entre la sección de beneficios y "Cómo funciona", con el copy del manifiesto estilizado en el mismo diseño TinyFish de la landing actual (tipografía grande, monospace para etiquetas, layout limpio).

