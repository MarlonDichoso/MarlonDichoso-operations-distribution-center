import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const expected = process.env.TECH_ADMIN_SESSION_SECRET || "";
  const supplied = request.cookies.get("unified_ops_tech_admin")?.value || "";
  return NextResponse.json({
    authenticated: Boolean(expected && supplied && supplied === expected),
    configured: Boolean(process.env.TECH_ADMIN_PASSWORD && expected),
  });
}

