import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const employeeSecret = process.env.EMPLOYEE_SESSION_SECRET || "";
  const employeeCookie =
    request.cookies.get("unified_ops_employee")?.value || "";
  const adminSecret = process.env.TECH_ADMIN_SESSION_SECRET || "";
  const adminCookie =
    request.cookies.get("unified_ops_tech_admin")?.value || "";
  const adminAuthenticated = Boolean(
    adminSecret && adminCookie === adminSecret,
  );
  const employeeAuthenticated = Boolean(
    employeeSecret && employeeCookie === employeeSecret,
  );

  return NextResponse.json({
    authenticated: adminAuthenticated || employeeAuthenticated,
    configured: Boolean(
      process.env.EMPLOYEE_ACCESS_PASSWORD && employeeSecret,
    ),
    role: adminAuthenticated
      ? "tech-admin"
      : employeeAuthenticated
        ? "employee"
        : null,
  });
}
