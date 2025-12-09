import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, messages } = await req.json();
    const authHeader = req.headers.get("Authorization");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader! } } }
    );

    console.log("RAG chat for project:", projectId);

    // Fetch training config, examples, and document chunks in parallel
    const [trainingRes, examplesRes, chunksRes] = await Promise.all([
      supabaseClient
        .from("project_training")
        .select("system_prompt, first_message")
        .eq("project_id", projectId)
        .maybeSingle(),
      supabaseClient
        .from("training_examples")
        .select("question, answer")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .limit(20),
      supabaseClient
        .from("document_chunks")
        .select("content")
        .eq("project_id", projectId)
        .limit(10),
    ]);

    const training = trainingRes.data;
    const examples = examplesRes.data || [];
    const chunks = chunksRes.data || [];
    const context = chunks.map(c => c.content).join("\n\n");

    console.log(`Training: ${training ? 'configured' : 'default'}, Examples: ${examples.length}, Chunks: ${chunks.length}`);

    // Build system prompt
    let systemPrompt = training?.system_prompt?.trim() 
      || "Eres un asistente experto que responde preguntas basándote en el contexto proporcionado. Responde en español de forma clara y precisa.";

    // Add few-shot examples if available
    if (examples.length > 0) {
      systemPrompt += "\n\n## Ejemplos de cómo debes responder:\n";
      examples.forEach((ex, i) => {
        systemPrompt += `\n### Ejemplo ${i + 1}:\nPregunta: ${ex.question}\nRespuesta: ${ex.answer}\n`;
      });
      systemPrompt += "\nSigue el estilo de estos ejemplos al responder.";
    }

    // Add context from documents
    if (context) {
      systemPrompt += `\n\n## CONTEXTO (usa esta información para responder):\n${context}`;
    }

    systemPrompt += "\n\nSi la respuesta no está en el contexto, indica amablemente que no tienes esa información.";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo más tarde." }), { 
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Recarga tu cuenta." }), { 
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || "No pude generar una respuesta.";

    console.log("RAG response generated successfully");

    return new Response(JSON.stringify({ response: assistantMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const error = e as Error;
    console.error("RAG chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});