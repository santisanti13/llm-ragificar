// Public demo RAG endpoint for the landing page.
// - Accepts multipart/form-data: file (txt/md/pdf, <=2MB) + question.
// - Rate-limited to 5 calls per IP per UTC day via public.demo_usage.
// - Lightweight: extracts text in-memory, stuffs as context, streams Gemini.
// - Does NOT persist user content. Nothing is stored beyond the IP-hash counter.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const CHAT_MODEL = "google/gemini-2.5-flash";
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_CONTEXT_CHARS = 60_000;
const DAILY_LIMIT = 5;

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

async function extractPdfText(base64: string, apiKey: string): Promise<string> {
  const r = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Extrae TODO el texto de este PDF. Devuelve solo texto plano, sin comentarios." },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
        ],
      }],
      temperature: 0,
      max_tokens: 32000,
    }),
  });
  if (!r.ok) throw new Error(`PDF extract ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Demo no configurada" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Rate limit
    const ip = getClientIp(req);
    const ipHash = await sha256(ip + ":" + (Deno.env.get("SUPABASE_JWKS") || "salt"));
    const today = new Date().toISOString().slice(0, 10);
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: existing } = await admin
      .from("demo_usage")
      .select("id, count")
      .eq("ip_hash", ipHash)
      .eq("day", today)
      .maybeSingle();

    if (existing && existing.count >= DAILY_LIMIT) {
      return new Response(JSON.stringify({
        error: `Has alcanzado el límite de ${DAILY_LIMIT} demos hoy. Crea una cuenta gratis para seguir probando.`,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse multipart
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const question = (form.get("question") as string | null)?.trim();

    if (!file || !question) {
      return new Response(JSON.stringify({ error: "Falta archivo o pregunta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Archivo demasiado grande (máx 2MB)" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text
    const name = file.name.toLowerCase();
    const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
    let text = "";
    if (isPdf) {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const b64 = btoa(bin);
      text = await extractPdfText(b64, apiKey);
    } else {
      text = await file.text();
    }
    text = text.trim();
    if (!text) {
      return new Response(JSON.stringify({ error: "No se pudo extraer texto del archivo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > MAX_CONTEXT_CHARS) text = text.slice(0, MAX_CONTEXT_CHARS) + "\n[...truncado para la demo...]";

    // Bump counter (best effort, before streaming)
    if (existing) {
      await admin.from("demo_usage").update({ count: existing.count + 1, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await admin.from("demo_usage").insert({ ip_hash: ipHash, day: today, count: 1 });
    }

    // Stream answer
    const systemPrompt = `Eres el asistente de demo de RAGify. Responde EXCLUSIVAMENTE con la información del CONTEXTO. Si la respuesta no está en el contexto, di literalmente: "No encontré esa información en el documento que subiste." Sé conciso y en español.`;
    const userPrompt = `CONTEXTO DEL DOCUMENTO:\n"""\n${text}\n"""\n\nPREGUNTA: ${question}`;

    const upstream = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        stream: true,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errTxt = await upstream.text().catch(() => "");
      console.error("Gateway error", upstream.status, errTxt);
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas peticiones, prueba en un momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "Demo sin créditos temporalmente." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Error generando respuesta" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pipe through as SSE text stream of `data: {delta}` lines, terminated by [DONE]
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          } catch { /* skip */ }
        }
      },
      cancel() { reader.cancel(); },
    });

    const remaining = DAILY_LIMIT - ((existing?.count ?? 0) + 1);
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Demo-Remaining": String(remaining),
      },
    });
  } catch (e) {
    console.error("demo-rag error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Error inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
