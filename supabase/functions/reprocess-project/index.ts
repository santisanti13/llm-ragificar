import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } =
    await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub;

  let body: { project_id?: string; only_failed?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const projectId = body.project_id;
  const onlyFailed = body.only_failed === true;

  if (!projectId || typeof projectId !== "string") {
    return new Response(JSON.stringify({ error: "project_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Verify project ownership
  const { data: project, error: projErr } = await admin
    .from("projects")
    .select("id, user_id, name")
    .eq("id", projectId)
    .single();

  if (projErr || !project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (project.user_id !== userId) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // List documents to reprocess
  let docQuery = admin
    .from("documents")
    .select("id, name, status")
    .eq("project_id", projectId);
  if (onlyFailed) docQuery = docQuery.in("status", ["error", "processing"]);

  const { data: docs, error: docsErr } = await docQuery;
  if (docsErr) {
    return new Response(
      JSON.stringify({ error: "Failed to list documents" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const docList = docs ?? [];

  // Fire-and-forget: do the heavy work in background, respond immediately.
  // Progress is observable via documents.status + document_chunks table.
  const work = async () => {
    for (const doc of docList) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/process-document`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documentId: doc.id }),
        });
        const text = await res.text();
        console.log(`[reprocess-project] ${doc.name}: ${res.status} ${text.slice(0, 200)}`);
      } catch (e) {
        console.error(`[reprocess-project] ${doc.name} failed:`, (e as Error).message);
      }
    }
    console.log(`[reprocess-project] DONE for project ${project.name} (${docList.length} docs)`);
  };

  // @ts-ignore - EdgeRuntime is provided by Supabase Edge Runtime
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work());
  } else {
    work(); // best-effort
  }

  return new Response(
    JSON.stringify({
      project: project.name,
      queued: docList.length,
      message: "Reprocessing started in background. Monitor documents.status to track progress.",
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
