import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// Fix 2: Embedding model centralizado.
// Proveedor: Lovable AI Gateway (proxy OpenAI-compatible).
// Modelo: google/gemini-embedding-001 vía OpenRouter.
// Dimensión nativa: 3072; aquí truncamos vía Matryoshka a 768 para
// encajar con la columna `document_chunks.embedding vector(768)`.
// Coste: créditos de Lovable AI. No hay fallback local — si el gateway
// cae, los chunks se insertan con embedding=NULL y la búsqueda
// degrada a sólo FTS hasta que se reprocesen.
// ============================================================
const EMBEDDING_MODEL = "google/gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_BATCH_SIZE = 20;
const CHAT_MODEL = "google/gemini-2.5-flash";
const GATEWAY_BASE = "https://ai.gateway.lovable.dev/v1";

// Use Gemini to extract text from PDF binary data
async function extractTextFromPdf(pdfBase64: string, apiKey: string): Promise<string> {
  const response = await fetch(`${GATEWAY_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL the text content from this PDF document. Return ONLY the raw text, preserving paragraphs and structure. Do not add any commentary, headers, or formatting beyond what exists in the document. If tables exist, represent them as plain text.",
            },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 64000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini PDF extraction error:", response.status, errorText);
    if (response.status === 429) throw new Error("Rate limit exceeded extracting PDF");
    if (response.status === 402) throw new Error("Out of credits extracting PDF");
    throw new Error(`PDF extraction error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Generate embeddings via Lovable AI Gateway with explicit error
// handling for the common failure modes (429 rate-limit, 402 credits,
// 5xx upstream). Returns nulls in-position so caller can persist
// chunks even if a batch fails — search degrades to FTS for those.
async function generateEmbeddings(texts: string[], apiKey: string): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    let attempt = 0;
    let success = false;
    while (attempt < 2 && !success) {
      attempt++;
      try {
        const res = await fetch(`${GATEWAY_BASE}/embeddings`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: batch,
            dimensions: EMBEDDING_DIMENSIONS,
          }),
        });
        if (res.status === 429) {
          console.warn(`Embedding rate-limited at batch ${i}, attempt ${attempt}; backing off`);
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        if (res.status === 402) {
          console.error(`Embedding 402 (out of credits) at batch ${i}; aborting batch`);
          for (let j = 0; j < batch.length; j++) results.push(null);
          success = true;
          break;
        }
        if (!res.ok) {
          const errText = await res.text();
          console.error(`Embedding batch ${i} failed: ${res.status} ${errText}`);
          for (let j = 0; j < batch.length; j++) results.push(null);
          success = true;
          break;
        }
        const data = await res.json();
        const embs = (data.data || []).map((d: any) => d.embedding as number[]);
        for (let j = 0; j < batch.length; j++) results.push(embs[j] ?? null);
        success = true;
      } catch (e) {
        console.error(`Embedding network error at batch ${i}, attempt ${attempt}:`, e);
        if (attempt >= 2) {
          for (let j = 0; j < batch.length; j++) results.push(null);
        }
      }
    }
  }
  return results;
}

// ============================================================
// Fix 1: Recursive character splitter, sentence-aware.
// Splits on paragraph -> sentence -> word boundary, never mid-word.
// chunkSize/chunkOverlap are character counts (~4 chars/token in EN,
// ~5 in ES). Default 1000/200 ≈ 200-250 tokens, conservative for
// embedding context windows. Tunable per project.
// ============================================================
function splitBySentence(text: string): string[] {
  // Spanish + English sentence boundary; keeps punctuation.
  return text.split(/(?<=[.!?¡¿])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/).filter(Boolean);
}

function splitByWord(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let buf = "";
  for (const w of words) {
    if ((buf + " " + w).length > maxLen && buf) {
      out.push(buf);
      buf = w;
    } else {
      buf = buf ? buf + " " + w : w;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const units: string[] = [];

  // Recursive descent: paragraph -> sentence -> word
  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      units.push(para);
      continue;
    }
    const sentences = splitBySentence(para);
    for (const sent of sentences) {
      if (sent.length <= chunkSize) {
        units.push(sent);
      } else {
        // Last resort: word-level split, never breaks mid-word
        for (const piece of splitByWord(sent, chunkSize)) units.push(piece);
      }
    }
  }

  // Greedy pack units into chunks with overlap, preserving boundaries
  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (!current) {
      current = unit;
    } else if (current.length + 2 + unit.length <= chunkSize) {
      current += "\n\n" + unit;
    } else {
      chunks.push(current);
      // Build overlap from tail of previous chunk, snapped to word boundary
      if (chunkOverlap > 0 && current.length > chunkOverlap) {
        const tail = current.slice(-chunkOverlap);
        const snapped = tail.replace(/^\S*\s+/, ""); // drop partial leading word
        current = (snapped ? snapped + "\n\n" : "") + unit;
      } else {
        current = unit;
      }
    }
  }
  if (current) chunks.push(current);

  return chunks.map((c) => c.trim()).filter((c) => c.length > 50);
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Authentication ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub;

  // Admin client for processing operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let documentId: string | undefined;

  try {
    const body = await req.json();
    documentId = body.documentId;
    console.log("Processing document:", documentId, "by user:", userId);

    // Verify document ownership
    const { data: doc, error: docError } = await supabaseAdmin
      .from("documents").select("*").eq("id", documentId).single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (doc.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: you do not own this document" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin.from("documents").update({ status: "processing" }).eq("id", documentId);

    // Fetch project training config for chunk settings
    const { data: trainingConfig } = await supabaseAdmin
      .from("project_training")
      .select("chunk_size, chunk_overlap")
      .eq("project_id", doc.project_id)
      .maybeSingle();

    const chunkSize = trainingConfig?.chunk_size ?? 1000;
    const chunkOverlap = trainingConfig?.chunk_overlap ?? 200;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Download file
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("documents").download(doc.file_path);

    if (downloadError) throw new Error(`Failed to download: ${downloadError.message}`);

    // Determine if PDF or text
    const isPdf = doc.name.toLowerCase().endsWith(".pdf");
    let text: string;

    if (isPdf) {
      console.log("Extracting text from PDF using Gemini...");
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      let binary = "";
      const chunkSizeB64 = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSizeB64) {
        const chunk = uint8Array.subarray(i, i + chunkSizeB64);
        binary += String.fromCharCode(...chunk);
      }
      const pdfBase64 = btoa(binary);
      
      text = await extractTextFromPdf(pdfBase64, LOVABLE_API_KEY);
      console.log(`Extracted ${text.length} chars from PDF`);
    } else {
      text = await fileData.text();
    }

    if (!text || text.trim().length < 10) {
      throw new Error("No text could be extracted from the document");
    }

    const validChunks = chunkText(text, chunkSize, chunkOverlap);
    console.log(`Chunking with size=${chunkSize}, overlap=${chunkOverlap}, chunks=${validChunks.length}`);

    // Delete old chunks for this document (for re-processing)
    await supabaseAdmin.from("document_chunks").delete().eq("document_id", documentId);

    if (validChunks.length === 0) {
      throw new Error("Document yielded 0 chunks after splitting");
    }

    console.log(`Generating embeddings for ${validChunks.length} chunks...`);
    const embeddings = await generateEmbeddings(validChunks, LOVABLE_API_KEY);
    const successCount = embeddings.filter((e) => e !== null).length;
    console.log(`Got ${successCount}/${validChunks.length} embeddings`);

    const chunkRecords = validChunks.map((content, index) => ({
      document_id: documentId,
      project_id: doc.project_id,
      user_id: doc.user_id, // defense in depth; trigger also enforces
      content,
      chunk_index: index,
      // pgvector accepts a string like "[0.1,0.2,...]"
      embedding: embeddings[index] ? `[${embeddings[index]!.join(",")}]` : null,
    }));


    const { error: insertError } = await supabaseAdmin.from("document_chunks").insert(chunkRecords);
    if (insertError) {
      console.error("Insert error:", JSON.stringify(insertError));
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // Verify chunks actually landed (defensive — catches silent FK / RLS issues)
    const { count: persistedCount, error: countError } = await supabaseAdmin
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", documentId);

    if (countError || !persistedCount || persistedCount === 0) {
      throw new Error(`Chunks were not persisted (count=${persistedCount ?? 0})`);
    }

    console.log(`Inserted ${persistedCount} chunks successfully (${successCount} with embeddings)`);

    await supabaseAdmin.from("documents").update({
      status: "ready",
      chunk_count: persistedCount,
      error_message: null,
    }).eq("id", documentId);

    return new Response(JSON.stringify({
      success: true,
      chunks: persistedCount,
      embeddings: successCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const error = e as Error;
    console.error("[INTERNAL ERROR] process-document:", error.message, error.stack);
    if (documentId) {
      await supabaseAdmin.from("documents").update({ status: "error", error_message: "Processing failed" }).eq("id", documentId);
    }
    return new Response(JSON.stringify({ error: "An internal error occurred while processing the document." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
