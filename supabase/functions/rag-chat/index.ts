import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { projectId, messages } = await req.json();

    // Verify project ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project || project.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Project not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("RAG chat for project:", projectId, "by user:", userId);

    const lastUserMessage = messages?.filter((m: any) => m.role === "user").pop()?.content || "";

    // Fetch training config and examples
    const [trainingRes, examplesRes] = await Promise.all([
      supabaseClient
        .from("project_training")
        .select("system_prompt, first_message, temperature, similarity_threshold, match_count, model")
        .eq("project_id", projectId)
        .maybeSingle(),
      supabaseClient
        .from("training_examples")
        .select("question, answer")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .limit(20),
    ]);

    const training = trainingRes.data;
    const examples = examplesRes.data || [];

    const temperature = training?.temperature ?? 0.7;
    const matchCount = training?.match_count ?? 8;
    const similarityThreshold = training?.similarity_threshold ?? 0.3;
    const model = training?.model || "google/gemini-2.5-flash";

    // Hybrid search: semantic (pgvector) + keyword (FTS)
    let context = "";
    let chunksUsed = 0;
    let searchSource = "none";
    type SelectedChunk = { id: string; content: string; score: number; document_id?: string; chunk_index?: number };
    let selectedChunks: SelectedChunk[] = [];

    if (lastUserMessage) {
      const merged = new Map<string, SelectedChunk>();

      // 1) Semantic search via embeddings
      try {
        const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-embedding-001", input: [lastUserMessage], dimensions: 768 }),
        });
        if (embRes.ok) {
          const embJson = await embRes.json();
          const queryEmbedding = embJson.data?.[0]?.embedding;
          if (queryEmbedding) {
            const { data: semChunks } = await supabaseAdmin.rpc("match_document_chunks", {
              query_embedding: `[${queryEmbedding.join(",")}]`,
              match_project_id: projectId,
              match_threshold: similarityThreshold,
              match_count: matchCount,
            });
            if (semChunks && semChunks.length > 0) {
              for (const c of semChunks) {
                merged.set(c.id, {
                  id: c.id,
                  content: c.content,
                  score: 1.0 + (c.similarity ?? 0),
                  document_id: c.document_id,
                  chunk_index: c.chunk_index,
                });
              }
              console.log(`Semantic: ${semChunks.length} chunks`);
            }
          }
        } else {
          console.error("Embedding query failed:", embRes.status);
        }
      } catch (e) {
        console.error("Semantic search failed:", e);
      }

      // 2) FTS keyword search
      try {
        const { data: ftsChunks } = await supabaseAdmin.rpc("search_document_chunks_fts", {
          search_query: lastUserMessage,
          search_project_id: projectId,
          max_results: matchCount,
        });
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
              merged.set(c.id, {
                id: c.id,
                content: c.content,
                score: 0.5 + (c.rank ?? 0),
                document_id: c.document_id,
                chunk_index: c.chunk_index,
              });
              ftsKept++;
            }
          }
          console.log(`FTS: ${ftsChunks.length} found, ${ftsKept} kept`);
        }
      } catch (e) {
        console.error("FTS search failed:", e);
      }

      if (merged.size > 0) {
        selectedChunks = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, matchCount);
        context = selectedChunks.map((c) => c.content).join("\n\n");
        chunksUsed = selectedChunks.length;
        searchSource = "hybrid";
      }
    }

    // Resolve document filenames for citations
    const sources: Array<{ document_id: string; filename: string; chunk_index: number; snippet: string }> = [];
    if (selectedChunks.length > 0) {
      const docIds = [...new Set(selectedChunks.map((c) => c.document_id).filter(Boolean) as string[])];
      const { data: docs } = await supabaseAdmin
        .from("documents")
        .select("id, filename")
        .in("id", docIds);
      const docMap = new Map((docs || []).map((d: any) => [d.id, d.filename]));
      for (const c of selectedChunks) {
        if (!c.document_id) continue;
        sources.push({
          document_id: c.document_id,
          filename: docMap.get(c.document_id) || "Documento",
          chunk_index: c.chunk_index ?? 0,
          snippet: (c.content || "").slice(0, 220),
        });
      }
    }

    console.log(`Search: ${searchSource}, chunks=${chunksUsed}, sources=${sources.length}`);

    // Build system prompt
    let systemPrompt =
      training?.system_prompt?.trim() ||
      "Eres un asistente experto que responde preguntas basándote en el contexto proporcionado. Responde en español de forma clara y precisa.";

    if (examples.length > 0) {
      systemPrompt += "\n\n## Ejemplos de cómo debes responder:\n";
      examples.forEach((ex: any, i: number) => {
        systemPrompt += `\n### Ejemplo ${i + 1}:\nPregunta: ${ex.question}\nRespuesta: ${ex.answer}\n`;
      });
      systemPrompt += "\nSigue el estilo de estos ejemplos al responder.";
    }

    if (context) {
      systemPrompt += `\n\n## CONTEXTO (usa esta información para responder):\n${context}`;
    }

    systemPrompt += "\n\nSi la respuesta no está en el contexto, indica amablemente que no tienes esa información.";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    // Prepend a sources SSE event, then pipe the AI stream
    const encoder = new TextEncoder();
    const sourcesEvent = `event: sources\ndata: ${JSON.stringify({ sources })}\n\n`;
    const aiReader = aiResponse.body!.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(sourcesEvent));
        try {
          while (true) {
            const { done, value } = await aiReader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          console.error("Stream pipe error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    const error = e as Error;
    console.error("[INTERNAL ERROR] RAG chat:", error.message, error.stack);
    return new Response(JSON.stringify({ error: "Ocurrió un error interno. Inténtalo de nuevo." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
