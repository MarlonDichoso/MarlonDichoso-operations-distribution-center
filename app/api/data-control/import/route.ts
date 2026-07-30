import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "unified_ops_tech_admin";

export async function POST(request: NextRequest) {
  const expectedSession = process.env.TECH_ADMIN_SESSION_SECRET || "";
  const currentSession = request.cookies.get(COOKIE_NAME)?.value || "";
  if (!expectedSession || currentSession !== expectedSession) {
    return NextResponse.json({ error: "Tech Admin access is required." }, { status: 401 });
  }

  const supabaseUrl = process.env.UNIFIED_SUPABASE_URL || "";
  const anonKey = process.env.UNIFIED_SUPABASE_ANON_KEY || "";
  const adminToken = process.env.ROUTING_ADMIN_TOKEN || "";
  if (!supabaseUrl || !anonKey || !adminToken) {
    return NextResponse.json({ error: "Task routing is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/import_routed_tasks`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      p_file_name: typeof body.fileName === "string" ? body.fileName : "",
      p_rows: Array.isArray(body.rows) ? body.rows : [],
      p_admin_token: adminToken,
    }),
  });
  const text = await response.text();
  const result = text ? JSON.parse(text) : null;
  if (!response.ok) {
    return NextResponse.json(
      { error: result?.message || "Task distribution failed." },
      { status: response.status },
    );
  }
  await fetch(`${supabaseUrl}/rest/v1/rpc/record_import_batch`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({
      p_admin_token: adminToken,
      p_file_name: typeof body.fileName === "string" ? body.fileName : "",
      p_total_rows: Array.isArray(body.rows) ? body.rows.length : 0,
      p_task_management_rows: result?.task_management || 0,
      p_maintenance_rows: result?.maintenance || 0,
      p_review_rows: 0,
    }),
  });
  return NextResponse.json(result);
}
