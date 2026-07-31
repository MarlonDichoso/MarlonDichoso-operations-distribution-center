import { NextResponse } from "next/server";

type AdminTask = {
  id?: string | number; taskName?: string; description?: string; project?: string;
  assignee?: string; status?: string; priority?: string; dueDate?: string;
  lastUpdatedAt?: string; archived?: boolean;
};
type MaintenanceTask = {
  id?: string; task_name?: string; property_address?: string; vendor_name?: string;
  status?: string; priority?: string; due_date?: string; updated_at?: string; archived?: boolean;
};

const completed = (status = "") => /complete|closed|done/i.test(status);
const active = (status = "") => !completed(status) && !/archive|deferred/i.test(status);
function attention(priority = "", dueDate = "", status = "") {
  const overdue = dueDate && new Date(`${dueDate}T23:59:59`).getTime() < Date.now();
  return active(status) && (/high|urgent/i.test(priority) || Boolean(overdue) || /waiting/i.test(status));
}
function completedThisMonth(status = "", updatedAt = "") {
  if (!completed(status) || !updatedAt) return false;
  const date = new Date(updatedAt), now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export async function GET() {
  const url = process.env.UNIFIED_SUPABASE_URL;
  const key = process.env.UNIFIED_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Shared database is not configured." }, { status: 503 });
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const [adminResponse, maintenanceResponse] = await Promise.all([
    fetch(`${url}/rest/v1/task_management_state?select=state,updated_at&id=eq.1`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/maintenance_tasks?select=id,task_name,property_address,vendor_name,status,priority,due_date,updated_at,archived&order=updated_at.desc`, { headers, cache: "no-store" }),
  ]);
  if (!adminResponse.ok || !maintenanceResponse.ok) {
    return NextResponse.json({ error: "Unable to read the shared applications." }, { status: 502 });
  }
  const adminRows = await adminResponse.json() as { state?: { tasks?: AdminTask[] } }[];
  const maintenanceRows = await maintenanceResponse.json() as MaintenanceTask[];
  const admin = (adminRows[0]?.state?.tasks || []).filter((task) => !task.archived);
  const maintenance = maintenanceRows.filter((task) => !task.archived);
  const combined = [
    ...admin.map((task) => ({
      id: String(task.id || ""), app: "Tasks",
      title: task.taskName || task.description || "Administrative task",
      meta: [task.project, task.assignee].filter(Boolean).join(" · "),
      status: task.status || "New", priority: task.priority || "Medium",
      dueDate: task.dueDate || "", updatedAt: task.lastUpdatedAt || "", appId: 0,
    })),
    ...maintenance.map((task) => ({
      id: String(task.id || ""), app: "Maintenance",
      title: task.task_name || "Maintenance task",
      meta: [task.property_address, task.vendor_name].filter(Boolean).join(" · "),
      status: task.status || "Open", priority: task.priority || "Medium",
      dueDate: task.due_date || "", updatedAt: task.updated_at || "", appId: 1,
    })),
  ];
  const recent = [...combined].sort((a, b) =>
    new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 8);
  const activeRows = combined.filter((task) => active(task.status));
  const attentionRows = combined.filter((task) => attention(task.priority, task.dueDate, task.status));
  const completedRows = combined.filter((task) => completedThisMonth(task.status, task.updatedAt));
  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    counts: {
      total: combined.length, active: activeRows.length, attention: attentionRows.length,
      completed: completedRows.length, admin: admin.length, maintenance: maintenance.length,
    },
    recent,
    details: {
      total: combined, active: activeRows,
      attention: attentionRows, completed: completedRows,
    },
  });
}
