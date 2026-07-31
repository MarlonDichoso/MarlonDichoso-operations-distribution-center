import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "unified_ops_tech_admin";

type RoutedRow = {
  title?: string;
  description?: string;
  route?: "task_management" | "maintenance" | "review";
  external_id?: string;
  external_url?: string;
  status_code?: string;
  priority_code?: string;
  due_date?: string;
  project?: string;
  department?: string;
  assignee?: string;
  notes?: string;
  last_updated_at?: string;
  created_at?: string;
  vendor?: string;
  property?: string;
  address?: string;
  unit?: string;
  category?: string;
};

type ExistingAdminTask = Record<string, unknown> & {
  id?: string | number;
  taskName?: string;
  buildiumTaskId?: string;
};

type ExistingMaintenanceTask = Record<string, unknown> & {
  id?: string;
  task_id?: string;
  work_order_number?: string;
  task_name?: string;
  property_address?: string;
  estimates?: unknown[];
  photos?: unknown[];
  updates?: unknown[];
  linked_task_ids?: unknown[];
};

function statusLabel(code = "") {
  if (code === "in_progress") return "In Progress";
  if (code === "waiting") return "Waiting on Vendor";
  if (code === "completed") return "Completed";
  return "New";
}

function maintenanceStatus(code = "") {
  if (code === "in_progress") return "In Progress";
  if (code === "waiting") return "Waiting on Vendor";
  if (code === "completed") return "Completed";
  return "Open";
}

function priorityLabel(code = "") {
  if (code === "high") return "High";
  if (code === "low") return "Low";
  return "Medium";
}

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function importedTimestamp(row: RoutedRow, fallback: string) {
  const value = row.last_updated_at || row.created_at || "";
  const buildiumDate = String(value).match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (buildiumDate) {
    const [, monthText, dayText, yearText, hourText, minuteText, secondText] =
      buildiumDate;
    const year = Number(yearText);
    const month = Number(monthText) - 1;
    const day = Number(dayText);
    const secondSundayMarch =
      8 + ((7 - new Date(Date.UTC(year, 2, 8)).getUTCDay()) % 7);
    const firstSundayNovember =
      1 + ((7 - new Date(Date.UTC(year, 10, 1)).getUTCDay()) % 7);
    const localMarker = Date.UTC(year, month, day, Number(hourText));
    const dstStart = Date.UTC(year, 2, secondSundayMarch, 2);
    const dstEnd = Date.UTC(year, 10, firstSundayNovember, 2);
    const easternOffsetHours =
      localMarker >= dstStart && localMarker < dstEnd ? 4 : 5;
    return new Date(
      Date.UTC(
        year,
        month,
        day,
        Number(hourText) + easternOffsetHours,
        Number(minuteText),
        Number(secondText || 0),
      ),
    ).toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function updateList(value: unknown) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? [value] : [];
}

function mergeImportedUpdate(
  existing: unknown,
  text: string | undefined,
  createdAt: string,
  fallbackId: number,
) {
  const updates = updateList(existing);
  const cleaned = String(text || "").trim();
  if (!cleaned) return updates;
  const duplicate = updates.some((item) => {
    if (!item || typeof item !== "object") return false;
    const update = item as { text?: string; createdAt?: string };
    return (
      String(update.text || "").trim() === cleaned &&
      String(update.createdAt || "") === createdAt
    );
  });
  if (duplicate) return updates;
  return [
    {
      id: Number.isFinite(Date.parse(createdAt))
        ? Date.parse(createdAt) + fallbackId
        : Date.now() + fallbackId,
      text: cleaned,
      createdAt,
    },
    ...updates,
  ].sort(
    (left, right) =>
      new Date(String((right as { createdAt?: string }).createdAt || 0)).getTime() -
      new Date(String((left as { createdAt?: string }).createdAt || 0)).getTime(),
  );
}

async function databaseRequest(
  url: string,
  key: string,
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.details || "Shared database update failed.");
  }
  return data;
}

export async function POST(request: NextRequest) {
  const expectedSession = process.env.TECH_ADMIN_SESSION_SECRET || "";
  const currentSession = request.cookies.get(COOKIE_NAME)?.value || "";
  if (!expectedSession || currentSession !== expectedSession) {
    return NextResponse.json(
      { error: "Tech Admin access is required." },
      { status: 401 },
    );
  }

  const supabaseUrl = process.env.UNIFIED_SUPABASE_URL || "";
  const anonKey = process.env.UNIFIED_SUPABASE_ANON_KEY || "";
  const adminToken = process.env.ROUTING_ADMIN_TOKEN || "";
  if (!supabaseUrl || !anonKey || !adminToken) {
    return NextResponse.json(
      { error: "Task routing is not configured." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rows: RoutedRow[] = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) throw new Error("No imported rows were provided.");
    if (rows.some((row) => row.route === "review" || !row.route)) {
      throw new Error("Every imported row must have a destination.");
    }

    const adminRows = rows.filter((row) => row.route === "task_management");
    const maintenanceRows = rows.filter((row) => row.route === "maintenance");
    const [stateRows, currentMaintenance] = await Promise.all([
      databaseRequest(
        supabaseUrl,
        anonKey,
        "task_management_state?select=state&id=eq.1",
      ),
      databaseRequest(
        supabaseUrl,
        anonKey,
        "maintenance_tasks?select=*",
      ),
    ]);

    const currentState = stateRows?.[0]?.state || {};
    const currentAdmin: ExistingAdminTask[] = Array.isArray(currentState.tasks)
      ? currentState.tasks
      : [];
    const now = new Date().toISOString();
    const nextAdmin = adminRows.map((row, index) => {
      const externalId = String(row.external_id || "").trim();
      const existing = currentAdmin.find((task) =>
        externalId
          ? normalized(task.buildiumTaskId) === normalized(externalId)
          : normalized(task.taskName) === normalized(row.title),
      );
      const sourceUpdatedAt = importedTimestamp(row, now);
      return {
        ...(existing || {}),
        id: existing?.id || Date.now() * 1000 + index,
        source: "Unified Ops CSV",
        taskName: row.title || "Imported task",
        description: row.description || "",
        status: statusLabel(row.status_code),
        priority: priorityLabel(row.priority_code),
        dueDate: row.due_date || "",
        project: row.project || "",
        department: row.department || "",
        assignee: row.assignee || "",
        remarks: undefined,
        buildiumTaskId: externalId,
        buildiumTaskUrl: row.external_url || "",
        archived: false,
        updates: mergeImportedUpdate(
          existing?.updates,
          row.notes,
          sourceUpdatedAt,
          index,
        ),
        lastUpdatedAt: sourceUpdatedAt,
        dateStarted:
          existing?.dateStarted ||
          importedTimestamp(
            { created_at: row.created_at },
            now,
          ).slice(0, 10),
      };
    });

    const existingMaintenance: ExistingMaintenanceTask[] =
      Array.isArray(currentMaintenance) ? currentMaintenance : [];
    const nextMaintenance = maintenanceRows.map((row) => {
      const externalId = String(row.external_id || "").trim();
      const address = row.address || row.property || "No property address";
      const existing = existingMaintenance.find((task) =>
        externalId
          ? [task.task_id, task.work_order_number].some(
              (value) => normalized(value) === normalized(externalId),
            )
          : normalized(task.task_name) === normalized(row.title) &&
            normalized(task.property_address) === normalized(address),
      );
      return {
        ...(existing || {}),
        id: existing?.id || crypto.randomUUID(),
        source: "Unified Ops CSV",
        task_id: externalId || null,
        task_name: row.title || "Imported task",
        vendor_name: row.vendor || "Unassigned Work",
        work_order_number: externalId || null,
        work_order_url: row.external_url || null,
        property_name: row.property || address,
        unit_number: row.unit || "",
        property_address: address,
        category: row.category || "General Repair",
        priority: priorityLabel(row.priority_code),
        due_date: row.due_date || null,
        status: maintenanceStatus(row.status_code),
        notes: row.notes || "",
        archived: false,
        archived_at: null,
        estimates: Array.isArray(existing?.estimates) ? existing.estimates : [],
        photos: Array.isArray(existing?.photos) ? existing.photos : [],
        updates: Array.isArray(existing?.updates) ? existing.updates : [],
        linked_task_ids: Array.isArray(existing?.linked_task_ids)
          ? existing.linked_task_ids
          : [],
        created_at: existing?.created_at || now,
        updated_at: now,
      };
    });

    if (existingMaintenance.length) {
      await databaseRequest(
        supabaseUrl,
        anonKey,
        "maintenance_tasks?archived=eq.false",
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ archived: true, archived_at: now }),
        },
      );
    }
    if (nextMaintenance.length) {
      await databaseRequest(supabaseUrl, anonKey, "maintenance_tasks", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(nextMaintenance),
      });
    }

    await databaseRequest(
      supabaseUrl,
      anonKey,
      "task_management_state?id=eq.1",
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          state: { ...currentState, tasks: nextAdmin, updatedAt: now },
          updated_at: now,
        }),
      },
    );

    await databaseRequest(
      supabaseUrl,
      anonKey,
      "rpc/record_import_batch",
      {
        method: "POST",
        body: JSON.stringify({
          p_admin_token: adminToken,
          p_file_name:
            typeof body.fileName === "string" ? body.fileName : "",
          p_total_rows: rows.length,
          p_task_management_rows: nextAdmin.length,
          p_maintenance_rows: nextMaintenance.length,
          p_review_rows: 0,
        }),
      },
    );

    return NextResponse.json({
      task_management: nextAdmin.length,
      maintenance: nextMaintenance.length,
      total: rows.length,
      authoritative: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Task distribution failed.",
      },
      { status: 500 },
    );
  }
}
