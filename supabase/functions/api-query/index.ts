import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Hash function for API key validation
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get("x-api-key") || req.headers.get("Authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: "API key required",
          message: "Provide your API key via 'x-api-key' header or 'Authorization: Bearer <key>'" 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { project_id, query, messages, stream = false } = body;

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!query && (!messages || messages.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Either 'query' or 'messages' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`API Query - Project: ${project_id}, Query: ${query?.substring(0, 50) || 'messages provided'}...`);

    // Create Supabase client with service role for public API access
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate API key against project_api_keys table
    const apiKeyHash = await hashApiKey(apiKey);
    const { data: apiKeyRecord, error: apiKeyError } = await supabaseClient
      .from("project_api_keys")
      .select("id, project_id, is_active")
      .eq("api_key_hash", apiKeyHash)
      .eq("project_id", project_id)
      .single();

    if (apiKeyError || !apiKeyRecord) {
      console.log("Invalid API key for project:", project_id);
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKeyRecord.is_active) {
      return new Response(
        JSON.stringify({ error: "API key is inactive" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last_used_at
    await supabaseClient
      .from("project_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKeyRecord.id);

    // Verify project exists and get user_id for logging
    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("id, name, user_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = project.user_id;

    // Fetch training config, examples, and document chunks in parallel
    const [trainingRes, examplesRes, chunksRes] = await Promise.all([
      supabaseClient
        .from("project_training")
        .select("system_prompt, first_message")
        .eq("project_id", project_id)
        .maybeSingle(),
      supabaseClient
        .from("training_examples")
        .select("question, answer")
        .eq("project_id", project_id)
        .eq("is_active", true)
        .limit(20),
      supabaseClient
        .from("document_chunks")
        .select("content")
        .eq("project_id", project_id)
        .limit(10),
    ]);

    const training = trainingRes.data;
    const examples = examplesRes.data || [];
    const chunks = chunksRes.data || [];
    const context = chunks.map(c => c.content).join("\n\n");

    console.log(`Training: ${training ? 'configured' : 'default'}, Examples: ${examples.length}, Chunks: ${chunks.length}`);

    // Build system prompt
    let systemPrompt = training?.system_prompt?.trim() 
      || "Eres un asistente experto que responde preguntas basándote en el contexto proporcionado. Responde de forma clara y precisa.";

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

    // Prepare messages
    const chatMessages = messages || [{ role: "user", content: query }];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || "Could not generate a response.";
    const usage = aiResponse.usage || {};
    const totalTokens = usage.total_tokens || 0;

    console.log(`API response generated in ${latencyMs}ms`);

    // Log the query for analytics
    const queryText = query || (messages && messages.length > 0 ? messages[messages.length - 1].content : "");
    await supabaseClient.from("api_query_logs").insert({
      project_id,
      user_id: userId,
      query: queryText.substring(0, 1000),
      response_preview: assistantMessage.substring(0, 200),
      tokens_used: totalTokens,
      latency_ms: latencyMs,
      status: "success"
    });

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        metadata: {
          project_id,
          model: "google/gemini-2.5-flash",
          latency_ms: latencyMs,
          chunks_used: chunks.length,
          examples_used: examples.length,
          usage: {
            prompt_tokens: usage.prompt_tokens || 0,
            completion_tokens: usage.completion_tokens || 0,
            total_tokens: totalTokens,
          }
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const error = e as Error;
    console.error("API query error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
