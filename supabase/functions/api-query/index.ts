import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get("x-api-key") || req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "API key required",
          message: "Provide your API key via 'x-api-key' header or 'Authorization: Bearer <key>'",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { project_id, query, messages, stream = false } = body;

    // Input validation
    if (!project_id || typeof project_id !== "string" || project_id.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid or missing project_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!query && (!messages || messages.length === 0)) {
      return new Response(JSON.stringify({ error: "Either 'query' or 'messages' is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (query && (typeof query !== "string" || query.length > 10000)) {
      return new Response(JSON.stringify({ error: "Invalid query (must be string, max 10000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messages) {
      if (!Array.isArray(messages) || messages.length > 100) {
        return new Response(JSON.stringify({ error: "Invalid messages (must be array, max 100)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const msg of messages) {
        if (!msg.role || !["user", "assistant", "system"].includes(msg.role)) {
          return new Response(JSON.stringify({ error: "Invalid message role" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!msg.content || typeof msg.content !== "string" || msg.content.length > 10000) {
          return new Response(JSON.stringify({ error: "Invalid message content (max 10000 chars)" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate API key
    const apiKeyHash = await hashApiKey(apiKey);
    const { data: apiKeyRecord, error: apiKeyError } = await supabaseClient
      .from("project_api_keys")
      .select("id, project_id, is_active")
      .eq("api_key_hash", apiKeyHash)
      .eq("project_id", project_id)
      .single();

    if (apiKeyError || !apiKeyRecord || !apiKeyRecord.is_active) {
      return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Rate Limiting ---
    const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
    const { data: currentLimit } = await supabaseClient
      .from("api_key_rate_limits")
      .select("request_count")
      .eq("api_key_id", apiKeyRecord.id)
      .eq("window_start", windowStart)
      .maybeSingle();
      
    const currentCount = currentLimit ? currentLimit.request_count : 0;
    
    if (currentCount >= 100) {
      return new Response(JSON.stringify({ error: "Too Many Requests", message: "Rate limit exceeded (100 req/min)." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    await supabaseClient
      .from("api_key_rate_limits")
      .upsert({ 
        api_key_id: apiKeyRecord.id, 
        window_start: windowStart,
        request_count: currentCount + 1
      }, { onConflict: "api_key_id, window_start" });
    // ---------------------

    await supabaseClient.from("project_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKeyRecord.id);

    const { data: project, error: projectError } = await supabaseClient
      .from("projects").select("id, name, user_id").eq("id", project_id).single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription limits
    const { data: canQuery } = await supabaseClient.rpc("can_user_make_query", {
      user_uuid: project.user_id
    });

    if (!canQuery) {
      const { data: userStats } = await supabaseClient.rpc("get_user_usage_stats", {
        user_uuid: project.user_id
      });
      
      const limits = userStats?.limits || { queries_per_month: 100 };
      const usage = userStats?.usage || { queries_this_month: 0 };
      
      return new Response(JSON.stringify({ 
        error: "Monthly query limit exceeded",
        message: `Has alcanzado tu límite de ${limits.queries_per_month} queries mensuales (usadas: ${usage.queries_this_month}). Mejora tu plan para continuar.`,
        upgrade_required: true,
        limits,
        usage
      }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch training config and examples
    const [trainingRes, examplesRes] = await Promise.all([
      supabaseClient.from("project_training")
        .select("system_prompt, first_message, temperature, similarity_threshold, match_count, model")
        .eq("project_id", project_id).maybeSingle(),
      supabaseClient.from("training_examples")
        .select("question, answer").eq("project_id", project_id).eq("is_active", true).limit(20),
    ]);

    const training = trainingRes.data;
    const examples = examplesRes.data || [];
    const temperature = training?.temperature ?? 0.2; // Fix 1: lower default for grounded answers
    const matchCount = training?.match_count ?? 8;
    const similarityThreshold = training?.similarity_threshold ?? 0.3;
    const model = training?.model || "google/gemini-2.5-flash";

    // Hybrid search: semantic + FTS
    const searchText = query || messages[messages.length - 1]?.content || "";
    let context = "";
    let chunksUsed = 0;
    type ScoredChunk = { id: string; content: string; score: number };
    let selectedChunks: ScoredChunk[] = [];

    if (searchText) {
      const merged = new Map<string, ScoredChunk>();

      try {
        const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-embedding-001", input: [searchText], dimensions: 768 }),
        });
        console.log(`[api-query] emb status=${embRes.status}`);
        if (embRes.ok) {
          const embJson = await embRes.json();
          const queryEmbedding = embJson.data?.[0]?.embedding;
          console.log(`[api-query] emb dims=${queryEmbedding?.length}`);
          if (queryEmbedding) {
            const { data: semChunks, error: semErr } = await supabaseClient.rpc("match_document_chunks", {
              query_embedding: `[${queryEmbedding.join(",")}]`,
              match_project_id: project_id,
              match_threshold: similarityThreshold,
              match_count: matchCount,
            });
            console.log(`[api-query] sem thr=${similarityThreshold} n=${semChunks?.length ?? 0} err=${semErr?.message ?? "none"}`);
            if (semChunks) {
              for (const c of semChunks) {
                merged.set(c.id, { id: c.id, content: c.content, score: 1.0 + (c.similarity ?? 0) });
              }
            }
          }
        } else {
          const t = await embRes.text();
          console.error(`[api-query] emb body=${t.slice(0,200)}`);
        }
      } catch (e) {
        console.error("Semantic search failed:", (e as Error).message);
      }

      try {
        const { data: ftsChunks, error: ftsErr } = await supabaseClient.rpc("search_document_chunks_fts", {
          search_query: searchText,
          search_project_id: project_id,
          max_results: matchCount,
        });
        console.log(`[api-query] fts n=${ftsChunks?.length ?? 0} err=${ftsErr?.message ?? "none"}`);
        if (ftsChunks && ftsChunks.length > 0) {
          const maxRank = Math.max(...ftsChunks.map((c: any) => c.rank ?? 0), 1e-6);
          let ftsKept = 0;
          for (const c of ftsChunks) {
            const normRank = (c.rank ?? 0) / maxRank;
            const existing = merged.get(c.id);
            if (existing) {
              existing.score += 0.5 + (c.rank ?? 0);
              ftsKept++;
            } else if (normRank >= similarityThreshold) {
              merged.set(c.id, { id: c.id, content: c.content, score: 0.5 + (c.rank ?? 0) });
              ftsKept++;
            }
          }
          console.log(`[api-query] fts kept=${ftsKept} threshold=${similarityThreshold}`);
        }
      } catch (e) {
        console.error("FTS search failed:", (e as Error).message);
      }

      console.log(`[api-query] merged=${merged.size}`);
      if (merged.size > 0) {
        selectedChunks = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, matchCount);
        // Fix 3: number chunks so the model can cite [n]
        context = selectedChunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
        chunksUsed = selectedChunks.length;
      }
    }

    // Fix 4: short-circuit when no relevant context was retrieved
    if (!context || chunksUsed === 0) {
      const fallback = "No encontré información relevante en la documentación para responder a esa pregunta.";
      console.log("[api-query] Empty context — short-circuiting LLM call");

      const queryText = (query || messages?.[messages.length - 1]?.content || "").substring(0, 1000);
      await supabaseClient.from("api_query_logs").insert({
        project_id,
        user_id: project.user_id,
        api_key_id: apiKeyRecord.id,
        query: queryText,
        response_preview: fallback.substring(0, 200),
        tokens_used: 0,
        latency_ms: 0,
        status: "no_context",
      });

      return new Response(
        JSON.stringify({
          response: fallback,
          metadata: {
            project_id, model, latency_ms: 0,
            chunks_used: 0, examples_used: 0,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            short_circuited: true,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt (Fix 2: strong grounding default)
    let systemPrompt = training?.system_prompt?.trim() ||
      "Eres un asistente experto que responde EXCLUSIVAMENTE con información presente en el CONTEXTO DOCUMENTAL proporcionado. Reglas estrictas: (1) Si la información no aparece de forma explícita en el contexto, responde únicamente: 'No tengo esa información en la documentación.' (2) No infieras, no completes con conocimiento general, no inventes datos, cifras ni nombres. (3) Cita las fuentes usando los números de los fragmentos entre corchetes, por ejemplo [1], [2], cuando uses información de un fragmento. (4) Responde en español de forma clara y precisa.";

    if (examples.length > 0) {
      systemPrompt += "\n\n## Ejemplos de cómo debes responder:\n";
      examples.forEach((ex: any, i: number) => {
        systemPrompt += `\n### Ejemplo ${i + 1}:\nPregunta: ${ex.question}\nRespuesta: ${ex.answer}\n`;
      });
      systemPrompt += "\nSigue el estilo de estos ejemplos al responder.";
    }

    // Fix 5: token budget guard
    const MODEL_CTX_TOKENS = 128000;
    const BUDGET_TOKENS = Math.floor(MODEL_CTX_TOKENS * 0.7);
    const estimateTokens = (s: string) => Math.ceil(s.length / 4);
    const buildContext = (chunks: ScoredChunk[]) =>
      chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
    const historyText = (messages || [{ content: query || "" }]).map((m: any) => m.content || "").join("\n");
    const baseTokens = estimateTokens(systemPrompt) + estimateTokens(historyText);
    let trimmed = 0;
    while (
      selectedChunks.length > 1 &&
      baseTokens + estimateTokens(buildContext(selectedChunks)) > BUDGET_TOKENS
    ) {
      selectedChunks.pop();
      trimmed++;
    }
    if (trimmed > 0) {
      console.log(`[api-query] Token budget: trimmed ${trimmed} chunks to fit ${BUDGET_TOKENS} tokens`);
      context = buildContext(selectedChunks);
      chunksUsed = selectedChunks.length;
    }

    systemPrompt += `\n\n## CONTEXTO DOCUMENTAL (usa esta información para responder):\n${context}`;

    const chatMessages = messages || [{ role: "user", content: query }];
    const startTime = Date.now();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
        temperature,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || "Could not generate a response.";
    const usage = aiResponse.usage || {};
    const totalTokens = usage.total_tokens || 0;

    // Log the query
    const queryText = query || messages[messages.length - 1]?.content || "";
    await supabaseClient.from("api_query_logs").insert({
      project_id,
      user_id: project.user_id,
      api_key_id: apiKeyRecord.id,
      query: queryText.substring(0, 1000),
      response_preview: assistantMessage.substring(0, 200),
      tokens_used: totalTokens,
      latency_ms: latencyMs,
      status: "success",
    });

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        metadata: {
          project_id,
          model,
          latency_ms: latencyMs,
          chunks_used: chunksUsed,
          examples_used: examples.length,
          usage: {
            prompt_tokens: usage.prompt_tokens || 0,
            completion_tokens: usage.completion_tokens || 0,
            total_tokens: totalTokens,
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const error = e as Error;
    console.error("[INTERNAL ERROR] API query:", error.message, error.stack);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
