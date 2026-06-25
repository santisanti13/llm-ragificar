// MCP Server (Streamable HTTP, JSON-RPC 2.0) per RAGify project.
// URL: /functions/v1/mcp-server/{project_id}
// Auth: Authorization: Bearer <project_api_key>
// Tools: search_knowledge, ask, list_documents
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, mcp-session-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "ragify-mcp", version: "1.0.0" };

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function jsonRpcError(id: unknown, code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TOOLS = [
  {
    name: "search_knowledge",
    description:
      "Búsqueda híbrida (semántica + full-text) sobre los documentos del proyecto RAG. Devuelve los fragmentos más relevantes con su score.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto de búsqueda en lenguaje natural." },
        top_k: { type: "integer", description: "Número máximo de fragmentos a devolver (1-20).", default: 8 },
      },
      required: ["query"],
    },
  },
  {
    name: "ask",
    description:
      "Pregunta en lenguaje natural respondida por el RAG del proyecto: recupera contexto y genera respuesta sintetizada con citaciones [n].",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Pregunta del usuario." },
      },
      required: ["question"],
    },
  },
  {
    name: "list_documents",
    description: "Lista los documentos indexados en el proyecto (nombre, tamaño, estado, fecha).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Máximo de documentos a devolver (1-200).", default: 50 },
      },
    },
  },
];

async function callApiQuery(apiKey: string, projectId: string, query: string) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/api-query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ project_id: projectId, query }),
  });
  const text = await res.text();
  let json: any; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

async function runTool(
  toolName: string,
  args: Record<string, any>,
  ctx: { supabase: ReturnType<typeof createClient>; projectId: string; apiKey: string },
) {
  const { supabase, projectId, apiKey } = ctx;

  if (toolName === "search_knowledge") {
    const query = String(args.query ?? "").trim();
    const topK = Math.max(1, Math.min(20, Number(args.top_k ?? 8) | 0));
    if (!query) throw new Error("'query' is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const merged = new Map<string, { id: string; content: string; document_id: string; score: number }>();

    // Semantic
    try {
      const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-embedding-001", input: [query], dimensions: 768 }),
      });
      if (embRes.ok) {
        const embJson = await embRes.json();
        const qe = embJson.data?.[0]?.embedding;
        if (qe) {
          const { data: sem } = await supabase.rpc("match_document_chunks", {
            query_embedding: `[${qe.join(",")}]`,
            match_project_id: projectId,
            match_threshold: 0.3,
            match_count: topK,
          });
          for (const c of sem ?? []) {
            merged.set(c.id, { id: c.id, content: c.content, document_id: c.document_id, score: 1 + (c.similarity ?? 0) });
          }
        }
      }
    } catch (e) {
      console.error("[mcp] semantic failed", (e as Error).message);
    }

    // FTS
    try {
      const { data: fts } = await supabase.rpc("search_document_chunks_fts", {
        search_query: query,
        search_project_id: projectId,
        max_results: topK,
      });
      for (const c of fts ?? []) {
        const ex = merged.get(c.id);
        if (ex) ex.score += 0.5 + (c.rank ?? 0);
        else merged.set(c.id, { id: c.id, content: c.content, document_id: c.document_id, score: 0.5 + (c.rank ?? 0) });
      }
    } catch (e) {
      console.error("[mcp] fts failed", (e as Error).message);
    }

    const ranked = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, topK);
    const docIds = [...new Set(ranked.map((r) => r.document_id))];
    const { data: docs } = docIds.length
      ? await supabase.from("documents").select("id, filename").in("id", docIds)
      : { data: [] as any[] };
    const nameById = new Map((docs ?? []).map((d: any) => [d.id, d.filename]));

    const results = ranked.map((r, i) => ({
      rank: i + 1,
      score: Number(r.score.toFixed(4)),
      document: nameById.get(r.document_id) ?? r.document_id,
      content: r.content,
    }));

    return {
      content: [
        { type: "text", text: results.length ? JSON.stringify(results, null, 2) : "Sin resultados relevantes." },
      ],
      structuredContent: { results, count: results.length },
    };
  }

  if (toolName === "ask") {
    const question = String(args.question ?? "").trim();
    if (!question) throw new Error("'question' is required");
    const r = await callApiQuery(apiKey, projectId, question);
    if (!r.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error ${r.status}: ${r.json?.error ?? r.json?.message ?? "unknown"}` }],
      };
    }
    return {
      content: [{ type: "text", text: r.json?.response ?? "" }],
      structuredContent: { response: r.json?.response, metadata: r.json?.metadata },
    };
  }

  if (toolName === "list_documents") {
    const limit = Math.max(1, Math.min(200, Number(args.limit ?? 50) | 0));
    const { data, error } = await supabase
      .from("documents")
      .select("id, filename, file_size, mime_type, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const items = (data ?? []).map((d: any) => ({
      id: d.id,
      filename: d.filename,
      size_bytes: d.file_size,
      mime_type: d.mime_type,
      status: d.status,
      created_at: d.created_at,
    }));
    return {
      content: [
        {
          type: "text",
          text: items.length ? JSON.stringify(items, null, 2) : "El proyecto no tiene documentos indexados.",
        },
      ],
      structuredContent: { documents: items, count: items.length },
    };
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Parse {project_id} from path: /functions/v1/mcp-server/{project_id}
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("mcp-server");
  const projectId = idx >= 0 ? parts[idx + 1] : undefined;

  if (!projectId) {
    return jsonResponse({ error: "Missing project_id in path: /functions/v1/mcp-server/{project_id}" }, 400);
  }

  // GET = readiness / discovery (helps users sanity-check the URL in browser)
  if (req.method === "GET") {
    return jsonResponse({
      server: SERVER_INFO,
      protocolVersion: PROTOCOL_VERSION,
      project_id: projectId,
      transport: "streamable-http",
      message: "MCP server ready. POST JSON-RPC 2.0 with Authorization: Bearer <project_api_key>.",
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Bearer auth
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const apiKey = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!apiKey) {
    return jsonResponse({ error: "Unauthorized: provide 'Authorization: Bearer <project_api_key>'" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const keyHash = await sha256Hex(apiKey);
  const { data: keyRow, error: keyErr } = await supabase
    .from("project_api_keys")
    .select("id, project_id, is_active")
    .eq("api_key_hash", keyHash)
    .eq("project_id", projectId)
    .maybeSingle();

  if (keyErr || !keyRow || !keyRow.is_active) {
    return jsonResponse({ error: "Invalid or inactive API key for this project" }, 401);
  }

  // Parse JSON-RPC (single or batch)
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(jsonRpcError(null, -32700, "Parse error"), 400);
  }

  const messages = Array.isArray(payload) ? payload : [payload];
  const responses: any[] = [];

  for (const msg of messages) {
    const { id, method, params } = msg ?? {};

    // Notifications (no id) -> no response
    const isNotification = id === undefined || id === null;

    try {
      if (method === "initialize") {
        responses.push(jsonRpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: SERVER_INFO,
          capabilities: { tools: { listChanged: false } },
          instructions:
            "Servidor MCP del proyecto RAGify. Usa `search_knowledge` para recuperar fragmentos, `ask` para respuestas sintetizadas con citaciones y `list_documents` para inventario.",
        }));
      } else if (method === "notifications/initialized" || method === "initialized") {
        // notification: no response
      } else if (method === "ping") {
        responses.push(jsonRpcResult(id, {}));
      } else if (method === "tools/list") {
        responses.push(jsonRpcResult(id, { tools: TOOLS }));
      } else if (method === "tools/call") {
        const toolName = params?.name;
        const args = params?.arguments ?? {};
        try {
          const result = await runTool(toolName, args, { supabase, projectId, apiKey });
          responses.push(jsonRpcResult(id, result));
        } catch (e) {
          const errMsg = (e as Error).message ?? "Tool execution failed";
          responses.push(jsonRpcResult(id, {
            isError: true,
            content: [{ type: "text", text: errMsg }],
          }));
        }
      } else if (method === "resources/list" || method === "prompts/list") {
        // Not supported but return empty lists for compatibility
        responses.push(jsonRpcResult(id, method === "resources/list" ? { resources: [] } : { prompts: [] }));
      } else {
        if (!isNotification) responses.push(jsonRpcError(id, -32601, `Method not found: ${method}`));
      }
    } catch (e) {
      if (!isNotification) responses.push(jsonRpcError(id, -32603, "Internal error", (e as Error).message));
    }
  }

  if (responses.length === 0) {
    // All notifications -> 202 Accepted, empty body
    return new Response(null, { status: 202, headers: corsHeaders });
  }

  const body = Array.isArray(payload) ? responses : responses[0];
  return jsonResponse(body);
});
