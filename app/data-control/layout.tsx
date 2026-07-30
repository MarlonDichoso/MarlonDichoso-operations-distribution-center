import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DataControlLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const supplied = cookieStore.get("unified_ops_tech_admin")?.value || "";
  const expected = process.env.TECH_ADMIN_SESSION_SECRET || "";

  if (!expected || supplied !== expected) {
    redirect("/tech-admin?returnTo=/data-control");
  }

  return children;
}

