import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "unified_ops_employee";

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function POST(request: NextRequest) {
  const configuredPassword = process.env.EMPLOYEE_ACCESS_PASSWORD || "";
  const sessionSecret = process.env.EMPLOYEE_SESSION_SECRET || "";
  if (!configuredPassword || !sessionSecret) {
    return NextResponse.json(
      { error: "Employee access is awaiting final password setup." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!safeEqual(password, configuredPassword)) {
    return NextResponse.json(
      { error: "The company access password is incorrect." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, sessionSecret, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
