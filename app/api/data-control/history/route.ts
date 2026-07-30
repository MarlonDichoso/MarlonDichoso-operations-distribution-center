import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = request.cookies.get("unified_ops_tech_admin")?.value;
  if (!session || session !== process.env.TECH_ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Tech Admin access required." }, { status: 401 });
  }
  const url = process.env.UNIFIED_SUPABASE_URL;
  const key = process.env.UNIFIED_SUPABASE_ANON_KEY;
  const token = process.env.ROUTING_ADMIN_TOKEN;
  if (!url || !key || !token) {
    return NextResponse.json({ error: "Import history is not configured." }, { status: 503 });
  }
  const response = await fetch(`${url}/rest/v1/rpc/get_import_history`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ p_admin_token: token }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data.message || "Unable to load import history." }, { status: response.status });
  }
  return NextResponse.json({ history: data });
}
