import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SITE_URL = 'https://llm-ragificar.lovable.app'
const NOTIFY_EMAIL = 'santiagojimenezvalero@gmail.com'

const TOPICS = [
  'Model Context Protocol (MCP): arquitectura, transporte JSON-RPC y casos de uso reales',
  'Búsqueda híbrida: cómo combinar BM25 y vectores con Reciprocal Rank Fusion',
  'Chunking semántico vs. recursivo: impacto medible en recall de RAG',
  'Por qué los LLMs alucinan y cómo RAG reduce hallucinations con citas verificables',
  'Embeddings multilingües: Matryoshka, dimensiones y trade-offs de coste',
  'HNSW vs IVFFlat en pgvector: cuándo elegir cada índice y cómo tunearlos',
  'Re-ranking con cross-encoders: cuándo merece la pena el coste extra',
  'Context windows largos vs RAG: el falso debate',
  'Memoria conversacional en agentes: ventana deslizante + resúmenes',
  'Evaluación de sistemas RAG: RAGAS, faithfulness y answer relevancy',
  'Multi-tenancy seguro en RAG: aislamiento por RLS en Postgres',
  'Fine-tuning vs RAG vs prompt engineering: cuándo cada uno',
  'Agentes con tool calling: patrones de loops, stop conditions y guardrails',
  'Deep learning aplicado a NLP empresarial: del transformer al RAG productivo',
  'Streaming SSE en LLMs: implementación, backpressure y manejo de errores',
  'Servidores MCP en producción: autenticación, rate limiting y observabilidad',
  'Quantization de embeddings: int8, binary y el coste real de la precisión',
  'Knowledge graphs + RAG: GraphRAG y recuperación estructurada',
]

function pickTopic(): string {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')!

  if (!lovableKey) {
    return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Allow caller to override topic for testing
  let forcedTopic: string | undefined
  try {
    const body = await req.json()
    forcedTopic = body?.topic
  } catch {
    /* no body */
  }

  const topic = forcedTopic || pickTopic()

  const systemPrompt = `Eres un editor técnico senior de RAGify, una plataforma RAG-as-a-Service con servidores MCP integrados. Escribes posts de blog en ESPAÑOL para una audiencia técnica (ingenieros ML, devs backend, CTOs). Nivel medio/alto — asume conocimiento de LLMs, embeddings, APIs. NO escribes para principiantes.

Reglas estrictas:
- 1200 a 1800 palabras.
- Estructura: H1 (título), introducción punzante (3-4 líneas), 4-6 secciones H2 con H3 internos cuando aplique, ejemplos de código en bloques fenced (\`\`\`), tabla comparativa cuando ayude.
- Tono: directo, técnico, sin paja corporativa. Cita papers/benchmarks reales cuando los conozcas.
- SIEMPRE incluye una sección final "## Cómo RAGify resuelve esto" (4-6 párrafos) donde conectes el tema con las capabilities reales de RAGify: hybrid search (FTS + pgvector con HNSW), embeddings Gemini con Matryoshka, multi-tenancy con RLS, API key por proyecto, servidor MCP nativo (JSON-RPC con search_knowledge/ask/list_documents), streaming SSE con citas, planes Free/Starter/Pro/Enterprise. Enlaza a https://llm-ragificar.lovable.app/ y termina con un CTA claro.
- Termina con "## FAQ" con 3-4 Q&A.

Devuelve ESTRICTAMENTE un JSON válido con esta forma:
{
  "title": "Título atractivo, 50-65 chars",
  "slug": "slug-en-kebab-case",
  "excerpt": "Resumen de 140-160 caracteres para meta description",
  "meta_title": "Título SEO 50-60 chars",
  "meta_description": "Meta desc 150-160 chars",
  "tags": ["3-6 tags en lowercase"],
  "content_md": "POST COMPLETO EN MARKDOWN comenzando con # Título"
}

No incluyas texto fuera del JSON. No uses markdown fencing alrededor del JSON.`

  const userPrompt = `Escribe el post de hoy sobre: "${topic}".`

  // 1. Generate with Lovable AI Gateway
  const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!aiRes.ok) {
    const errText = await aiRes.text()
    console.error('AI gateway error', aiRes.status, errText)
    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429, headers: corsHeaders })
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'Credits exhausted' }), { status: 402, headers: corsHeaders })
    }
    return new Response(JSON.stringify({ error: 'AI failed', detail: errText }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const aiJson = await aiRes.json()
  const raw = aiJson?.choices?.[0]?.message?.content ?? ''

  let post: any
  try {
    post = JSON.parse(raw)
  } catch (e) {
    // Try to recover JSON between first { and last }
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start >= 0 && end > start) {
      post = JSON.parse(raw.slice(start, end + 1))
    } else {
      console.error('Could not parse AI JSON:', raw.slice(0, 500))
      return new Response(JSON.stringify({ error: 'Bad AI response' }), { status: 500, headers: corsHeaders })
    }
  }

  const title: string = post.title?.trim() || topic.slice(0, 60)
  let slug: string = slugify(post.slug || title)
  if (!slug) slug = `post-${Date.now()}`

  // Ensure unique slug
  const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', slug).maybeSingle()
  if (existing) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  }

  const insertPayload = {
    slug,
    title,
    excerpt: post.excerpt ?? null,
    content_md: post.content_md ?? '',
    meta_title: post.meta_title ?? title,
    meta_description: post.meta_description ?? post.excerpt ?? null,
    tags: Array.isArray(post.tags) ? post.tags : [],
    topic,
    status: 'published',
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('blog_posts')
    .insert(insertPayload)
    .select()
    .single()

  if (insertErr) {
    console.error('Insert error:', insertErr)
    return new Response(JSON.stringify({ error: 'DB insert failed', detail: insertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const postUrl = `${SITE_URL}/blog/${slug}`

  // 2. Send notification email
  const contentPreview = (post.content_md || '').slice(0, 700) + '…'
  const emailRes = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'blog-post-generated',
      recipientEmail: NOTIFY_EMAIL,
      idempotencyKey: `blog-${inserted.id}`,
      templateData: {
        title,
        excerpt: post.excerpt ?? '',
        url: postUrl,
        topic,
        tags: insertPayload.tags,
        contentPreview,
      },
    },
  })

  if (emailRes.error) {
    console.warn('Email send failed (post was created):', emailRes.error)
  }

  return new Response(
    JSON.stringify({ success: true, post: inserted, url: postUrl, email_queued: !emailRes.error }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
