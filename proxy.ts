import { NextRequest, NextResponse } from "next/server";

function hasWorkspaceAccess(request: NextRequest): boolean {
  const employeeSecret = process.env.EMPLOYEE_SESSION_SECRET || "";
  const employeeCookie =
    request.cookies.get("unified_ops_employee")?.value || "";
  const adminSecret = process.env.TECH_ADMIN_SESSION_SECRET || "";
  const adminCookie =
    request.cookies.get("unified_ops_tech_admin")?.value || "";

  return Boolean(
    (employeeSecret && employeeCookie === employeeSecret) ||
      (adminSecret && adminCookie === adminSecret),
  );
}

export function proxy(request: NextRequest) {
  if (hasWorkspaceAccess(request)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/",
    "/task-management/:path*",
    "/maintenance-vendors/:path*",
    "/work-order-generator/:path*",
  ],
};
