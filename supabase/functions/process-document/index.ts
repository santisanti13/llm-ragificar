import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Use Gemini to extract text from PDF binary data
async function extractTextFromPdf(pdfBase64: string, apiKey: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL the text content from this PDF document. Return ONLY the raw text, preserving paragraphs and structure. Do not add any commentary, headers, or formatting beyond what exists in the document. If tables exist, represent them as plain text.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
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
    throw new Error(`PDF extraction error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Generate embeddings via Lovable AI Gateway.
// IMPORTANT: document_chunks.embedding column is vector(768). Gemini supports
// Matryoshka truncation via `dimensions` to match the column size.
async function generateEmbeddings(texts: string[], apiKey: string): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = [];
  const batchSize = 20;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-embedding-001",
          input: batch,
          dimensions: 768,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Embedding batch starting at ${i} failed: ${res.status} ${errText}`);
        for (let j = 0; j < batch.length; j++) results.push(null);
        continue;
      }
      const data = await res.json();
      const embs = (data.data || []).map((d: any) => d.embedding as number[]);
      for (let j = 0; j < batch.length; j++) results.push(embs[j] ?? null);
    } catch (e) {
      console.error("Embedding error:", e);
      for (let j = 0; j < batch.length; j++) results.push(null);
    }
  }
  return results;
}

function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + para).length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
          currentChunk = currentChunk.slice(-chunkOverlap) + "\n\n" + para;
        } else {
          currentChunk = para;
        }
      } else {
        if (para.length > chunkSize) {
          const sentences = para.split(/(?<=[.!?])\s+/);
          let sentenceChunk = "";
          for (const sentence of sentences) {
            if ((sentenceChunk + sentence).length > chunkSize) {
              if (sentenceChunk) chunks.push(sentenceChunk.trim());
              sentenceChunk = sentence;
            } else {
              sentenceChunk += (sentenceChunk ? " " : "") + sentence;
            }
          }
          currentChunk = sentenceChunk;
        } else {
          currentChunk = para;
        }
      }
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks.filter(c => c.length > 50);
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

    if (validChunks.length > 0) {
      console.log(`Generating embeddings for ${validChunks.length} chunks...`);
      const embeddings = await generateEmbeddings(validChunks, LOVABLE_API_KEY);
      const successCount = embeddings.filter((e) => e !== null).length;
      console.log(`Got ${successCount}/${validChunks.length} embeddings`);

      const chunkRecords = validChunks.map((content, index) => ({
        document_id: documentId,
        project_id: doc.project_id,
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
      console.log(`Inserted ${chunkRecords.length} chunks successfully`);
    }

    await supabaseAdmin.from("documents").update({ 
      status: "ready", 
      chunk_count: validChunks.length,
      error_message: null 
    }).eq("id", documentId);

    console.log(`Document processed: ${validChunks.length} chunks`);

    return new Response(JSON.stringify({ success: true, chunks: validChunks.length }), {
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
