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

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000),
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
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
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!query && (!messages || messages.length === 0)) {
      return new Response(JSON.stringify({ error: "Either 'query' or 'messages' is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (query && (typeof query !== "string" || query.length > 10000)) {
      return new Response(JSON.stringify({ error: "Invalid query (must be string, max 10000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messages) {
      if (!Array.isArray(messages) || messages.length > 100) {
        return new Response(JSON.stringify({ error: "Invalid messages (must be array, max 100)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const msg of messages) {
        if (!msg.role || typeof msg.role !== "string" || !["user", "assistant", "system"].includes(msg.role)) {
          return new Response(JSON.stringify({ error: "Invalid message role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!msg.content || typeof msg.content !== "string" || msg.content.length > 10000) {
          return new Response(JSON.stringify({ error: "Invalid message content (max 10000 chars)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    console.log(`API Query - Project: ${project_id}, Query: ${query?.substring(0, 50) || "messages provided"}...`);

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

    if (apiKeyError || !apiKeyRecord) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKeyRecord.is_active) {
      return new Response(JSON.stringify({ error: "API key is inactive" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseClient.from("project_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKeyRecord.id);

    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("id, name, user_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = project.user_id;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch training config and examples
    const [trainingRes, examplesRes] = await Promise.all([
      supabaseClient.from("project_training").select("system_prompt, first_message").eq("project_id", project_id).maybeSingle(),
      supabaseClient.from("training_examples").select("question, answer").eq("project_id", project_id).eq("is_active", true).limit(20),
    ]);

    const training = trainingRes.data;
    const examples = examplesRes.data || [];

    // Semantic search
    const searchText = query || (messages && messages.length > 0 ? messages[messages.length - 1].content : "");
    let context = "";
    let chunksUsed = 0;

    if (searchText) {
      try {
        const queryEmbedding = await generateEmbedding(searchText, LOVABLE_API_KEY);
        const { data: semanticChunks, error: matchError } = await supabaseClient.rpc("match_document_chunks", {
          query_embedding: JSON.stringify(queryEmbedding),
          match_project_id: project_id,
          match_threshold: 0.3,
          match_count: 8,
        });

        if (!matchError && semanticChunks && semanticChunks.length > 0) {
          context = semanticChunks.map((c: any) => c.content).join("\n\n");
          chunksUsed = semanticChunks.length;
          console.log(`Semantic search: ${chunksUsed} chunks`);
        }
      } catch (e) {
        console.error("Semantic search failed:", e);
      }
    }

    // Fallback to text chunks
    if (!context) {
      const { data: fallbackChunks } = await supabaseClient
        .from("document_chunks")
        .select("content")
        .eq("project_id", project_id)
        .limit(10);

      if (fallbackChunks) {
        context = fallbackChunks.map((c) => c.content).join("\n\n");
        chunksUsed = fallbackChunks.length;
      }
    }

    console.log(`Training: ${training ? "configured" : "default"}, Examples: ${examples.length}, Chunks: ${chunksUsed}`);

    // Build system prompt
    let systemPrompt =
      training?.system_prompt?.trim() ||
      "Eres un asistente experto que responde preguntas basándote en el contexto proporcionado. Responde de forma clara y precisa.";

    if (examples.length > 0) {
      systemPrompt += "\n\n## Ejemplos de cómo debes responder:\n";
      examples.forEach((ex, i) => {
        systemPrompt += `\n### Ejemplo ${i + 1}:\nPregunta: ${ex.question}\nRespuesta: ${ex.answer}\n`;
      });
      systemPrompt += "\nSigue el estilo de estos ejemplos al responder.";
    }

    if (context) {
      systemPrompt += `\n\n## CONTEXTO (usa esta información para responder):\n${context}`;
    }

    systemPrompt += "\n\nSi la respuesta no está en el contexto, indica amablemente que no tienes esa información.";

    const chatMessages = messages || [{ role: "user", content: query }];
    const startTime = Date.now();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || "Could not generate a response.";
    const usage = aiResponse.usage || {};
    const totalTokens = usage.total_tokens || 0;

    // Log the query
    const queryText = query || (messages && messages.length > 0 ? messages[messages.length - 1].content : "");
    await supabaseClient.from("api_query_logs").insert({
      project_id,
      user_id: userId,
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
          model: "google/gemini-2.5-flash",
          latency_ms: latencyMs,
          chunks_used: chunksUsed,
          examples_used: examples.length,
          semantic_search: chunksUsed > 0,
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
    console.error("API query error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
