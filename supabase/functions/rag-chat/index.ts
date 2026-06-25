import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Conversational memory thresholds
const MAX_RECENT_MESSAGES = 6; // keep last N raw turns in context
const SUMMARIZE_AFTER = 10; // start summarizing once thread has > N messages

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

    const { projectId, messages, threadId: incomingThreadId } = await req.json();

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

    console.log("RAG chat for project:", projectId, "by user:", userId, "thread:", incomingThreadId);

    const lastUserMessage = messages?.filter((m: any) => m.role === "user").pop()?.content || "";

    // --- Conversational memory: resolve thread ---
    let threadId: string | null = null;
    let threadSummary: string | null = null;
    let priorMessages: Array<{ role: string; content: string }> = [];

    if (incomingThreadId) {
      const { data: t } = await supabaseAdmin
        .from("conversation_threads")
        .select("id, user_id, summary, message_count")
        .eq("id", incomingThreadId)
        .maybeSingle();
      if (t && t.user_id === userId) {
        threadId = t.id;
        threadSummary = t.summary;
        // Load last raw messages for short-window context
        const { data: rows } = await supabaseAdmin
          .from("thread_messages")
          .select("role, content, created_at")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: false })
          .limit(MAX_RECENT_MESSAGES);
        priorMessages = (rows || []).reverse().map((r: any) => ({ role: r.role, content: r.content }));
      }
    }

    if (!threadId) {
      const title = (lastUserMessage || "Nueva conversación").slice(0, 60);
      const { data: created } = await supabaseAdmin
        .from("conversation_threads")
        .insert({ project_id: projectId, user_id: userId, title })
        .select("id")
        .single();
      threadId = created?.id ?? null;
    }

    // Persist the user message
    if (threadId && lastUserMessage) {
      await supabaseAdmin.from("thread_messages").insert({
        thread_id: threadId,
        user_id: userId,
        role: "user",
        content: lastUserMessage,
      });
    }

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

    const temperature = training?.temperature ?? 0.2; // Fix 1: lower default for grounded answers
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
        // Fix 3: number chunks so the model can cite [n]
        context = selectedChunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
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

    // Fix 4: short-circuit when no relevant context was retrieved
    if (!context || chunksUsed === 0) {
      const fallback = "No encontré información relevante en la documentación para responder a esa pregunta.";
      console.log("[rag-chat] Empty context — short-circuiting LLM call");

      // Persist assistant fallback
      if (threadId) {
        try {
          await supabaseAdmin.from("thread_messages").insert({
            thread_id: threadId, user_id: userId, role: "assistant", content: fallback,
          });
        } catch (e) { console.error("persist fallback failed", e); }
      }

      const encoder = new TextEncoder();
      const threadEvent = `event: thread\ndata: ${JSON.stringify({ thread_id: threadId })}\n\n`;
      const sourcesEvent = `event: sources\ndata: ${JSON.stringify({ sources: [] })}\n\n`;
      const fakeDelta = `data: ${JSON.stringify({ choices: [{ delta: { content: fallback } }] })}\n\n`;
      const done = `data: [DONE]\n\n`;
      const body = encoder.encode(threadEvent + sourcesEvent + fakeDelta + done);
      return new Response(body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // Build system prompt (Fix 2: strong grounding default)
    let systemPrompt =
      training?.system_prompt?.trim() ||
      "Eres un asistente experto que responde EXCLUSIVAMENTE con información presente en el CONTEXTO DOCUMENTAL proporcionado. Reglas estrictas: (1) Si la información no aparece de forma explícita en el contexto, responde únicamente: 'No tengo esa información en la documentación.' (2) No infieras, no completes con conocimiento general, no inventes datos, cifras ni nombres. (3) Cita las fuentes usando los números de los fragmentos entre corchetes, por ejemplo [1], [2], cuando uses información de un fragmento. (4) Responde en español de forma clara y precisa.";

    if (examples.length > 0) {
      systemPrompt += "\n\n## Ejemplos de cómo debes responder:\n";
      examples.forEach((ex: any, i: number) => {
        systemPrompt += `\n### Ejemplo ${i + 1}:\nPregunta: ${ex.question}\nRespuesta: ${ex.answer}\n`;
      });
      systemPrompt += "\nSigue el estilo de estos ejemplos al responder.";
    }

    if (threadSummary) {
      systemPrompt += `\n\n## RESUMEN DE LA CONVERSACIÓN ANTERIOR:\n${threadSummary}`;
    }

    // Fix 5: token budget guard — trim lowest-scored chunks if assembled prompt is too big
    const MODEL_CTX_TOKENS = 128000;
    const BUDGET_TOKENS = Math.floor(MODEL_CTX_TOKENS * 0.7);
    const estimateTokens = (s: string) => Math.ceil(s.length / 4);
    const buildContext = (chunks: typeof selectedChunks) =>
      chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
    const historyText = priorMessages.map((m) => m.content).join("\n") +
      (messages || []).map((m: any) => m.content).join("\n");
    const baseTokens = estimateTokens(systemPrompt) + estimateTokens(historyText);
    let trimmed = 0;
    while (
      selectedChunks.length > 1 &&
      baseTokens + estimateTokens(buildContext(selectedChunks)) > BUDGET_TOKENS
    ) {
      selectedChunks.pop(); // lowest-scored (already sorted desc)
      trimmed++;
    }
    if (trimmed > 0) {
      console.log(`[rag-chat] Token budget: trimmed ${trimmed} chunks to fit ${BUDGET_TOKENS} tokens`);
      context = buildContext(selectedChunks);
      chunksUsed = selectedChunks.length;
    }

    systemPrompt += `\n\n## CONTEXTO DOCUMENTAL (usa esta información para responder):\n${context}`;

    // Build final message array: system + (prior raw window) + current request messages
    // The client typically sends only the current user turn; we merge prior window from DB.
    const currentTurn = messages?.length ? messages : [];
    const seen = new Set(priorMessages.map((m) => `${m.role}|${m.content}`));
    const dedupedCurrent = currentTurn.filter((m: any) => !seen.has(`${m.role}|${m.content}`));
    const conversation = [
      { role: "system", content: systemPrompt },
      ...priorMessages,
      ...dedupedCurrent,
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: conversation,
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

    // Prepend thread + sources SSE events, then pipe the AI stream and capture assistant text
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const threadEvent = `event: thread\ndata: ${JSON.stringify({ thread_id: threadId })}\n\n`;
    const sourcesEvent = `event: sources\ndata: ${JSON.stringify({ sources })}\n\n`;
    const aiReader = aiResponse.body!.getReader();

    let assistantText = "";

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(threadEvent));
        controller.enqueue(encoder.encode(sourcesEvent));
        try {
          while (true) {
            const { done, value } = await aiReader.read();
            if (done) break;
            controller.enqueue(value);
            // Best-effort: extract assistant deltas to persist after stream
            try {
              const chunk = decoder.decode(value, { stream: true });
              for (const rawLine of chunk.split("\n")) {
                const line = rawLine.trim();
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                const parsed = JSON.parse(payload);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (typeof delta === "string") assistantText += delta;
              }
            } catch { /* ignore parse errors mid-stream */ }
          }
        } catch (e) {
          console.error("Stream pipe error:", e);
        } finally {
          controller.close();

          // Persist assistant message + maybe summarize (background)
          if (threadId && assistantText) {
            (async () => {
              try {
                await supabaseAdmin.from("thread_messages").insert({
                  thread_id: threadId!,
                  user_id: userId,
                  role: "assistant",
                  content: assistantText,
                });

                // Update message_count
                const { count } = await supabaseAdmin
                  .from("thread_messages")
                  .select("*", { count: "exact", head: true })
                  .eq("thread_id", threadId!);

                const newCount = count ?? 0;
                await supabaseAdmin
                  .from("conversation_threads")
                  .update({ message_count: newCount })
                  .eq("id", threadId!);

                // Summarize when crossing the threshold (every SUMMARIZE_AFTER msgs)
                if (newCount >= SUMMARIZE_AFTER && newCount % SUMMARIZE_AFTER === 0) {
                  const { data: allMsgs } = await supabaseAdmin
                    .from("thread_messages")
                    .select("role, content, created_at")
                    .eq("thread_id", threadId!)
                    .order("created_at", { ascending: true });

                  const transcript = (allMsgs || [])
                    .map((m: any) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`)
                    .join("\n");

                  const sumRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                      model: "google/gemini-2.5-flash",
                      stream: false,
                      temperature: 0.2,
                      messages: [
                        { role: "system", content: "Resume la siguiente conversación en español en 4-6 frases. Conserva entidades, decisiones y datos relevantes. Sé conciso." },
                        ...(threadSummary ? [{ role: "system", content: `Resumen previo: ${threadSummary}` }] : []),
                        { role: "user", content: transcript },
                      ],
                    }),
                  });
                  if (sumRes.ok) {
                    const sumJson = await sumRes.json();
                    const summary = sumJson?.choices?.[0]?.message?.content?.trim();
                    if (summary) {
                      await supabaseAdmin
                        .from("conversation_threads")
                        .update({ summary })
                        .eq("id", threadId!);
                    }
                  }
                }
              } catch (e) {
                console.error("Post-stream persist/summarize failed:", e);
              }
            })();
          }
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
