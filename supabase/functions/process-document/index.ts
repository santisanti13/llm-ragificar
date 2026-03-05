import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const errorText = await response.text();
    console.error("Embedding error:", response.status, errorText);
    throw new Error(`Embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + para).length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Apply overlap: keep the last `chunkOverlap` chars
        if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
          currentChunk = currentChunk.slice(-chunkOverlap) + "\n\n" + para;
        } else {
          currentChunk = para;
        }
      } else {
        // Single paragraph exceeds chunk size - split by sentences
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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let documentId: string | undefined;

  try {
    const body = await req.json();
    documentId = body.documentId;
    console.log("Processing document:", documentId);

    await supabaseAdmin.from("documents").update({ status: "processing" }).eq("id", documentId);

    const { data: doc, error: docError } = await supabaseAdmin
      .from("documents").select("*").eq("id", documentId).single();

    if (docError || !doc) throw new Error("Document not found");

    // Fetch project training config for chunk settings
    const { data: trainingConfig } = await supabaseAdmin
      .from("project_training")
      .select("chunk_size, chunk_overlap")
      .eq("project_id", doc.project_id)
      .maybeSingle();

    const chunkSize = trainingConfig?.chunk_size ?? 1000;
    const chunkOverlap = trainingConfig?.chunk_overlap ?? 200;

    console.log(`Chunking with size=${chunkSize}, overlap=${chunkOverlap}`);

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("documents").download(doc.file_path);

    if (downloadError) throw new Error(`Failed to download: ${downloadError.message}`);

    const text = await fileData.text();
    const validChunks = chunkText(text, chunkSize, chunkOverlap);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (validChunks.length > 0) {
      const chunkRecords = [];
      for (let index = 0; index < validChunks.length; index++) {
        const content = validChunks[index];
        let embedding = null;

        if (LOVABLE_API_KEY) {
          try {
            embedding = await generateEmbedding(content, LOVABLE_API_KEY);
            console.log(`Embedding ${index + 1}/${validChunks.length}`);
          } catch (e) {
            console.error(`Embedding failed for chunk ${index}:`, e);
          }
        }

        chunkRecords.push({
          document_id: documentId,
          project_id: doc.project_id,
          content,
          chunk_index: index,
          embedding: embedding ? JSON.stringify(embedding) : null,
        });
      }

      const { error: insertError } = await supabaseAdmin.from("document_chunks").insert(chunkRecords);
      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    await supabaseAdmin.from("documents").update({ status: "ready", chunk_count: validChunks.length }).eq("id", documentId);

    console.log(`Document processed: ${validChunks.length} chunks (size=${chunkSize}, overlap=${chunkOverlap})`);

    return new Response(JSON.stringify({ success: true, chunks: validChunks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const error = e as Error;
    console.error("Processing error:", error);
    if (documentId) {
      await supabaseAdmin.from("documents").update({ status: "error", error_message: error.message }).eq("id", documentId);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
