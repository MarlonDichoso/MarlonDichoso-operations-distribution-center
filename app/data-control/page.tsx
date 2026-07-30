"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type Route = "task_management" | "maintenance" | "review";
type Row = {
  id: number; title: string; description: string; address: string; property: string;
  unit: string; vendor: string; category: string; priority_code: string;
  status_code: string; due_date: string; assignee: string; department: string;
  project: string; notes: string; external_id: string; external_url: string;
  route: Route; reason: string;
};
type ImportHistory = {
  id: string; file_name: string; total_rows: number; task_management_rows: number;
  maintenance_rows: number; review_rows: number; created_at: string;
};

declare global {
  interface Window {
    APP_RUNTIME_CONFIG?: { supabaseUrl?: string; supabaseAnonKey?: string };
    downloadUnifiedDocumentBackup?: () => Promise<{ workOrders: number; verifications: number; files: number }>;
  }
}

const maintenanceWords = [
  "maintenance","repair","work order","vendor","plumbing","electrical","roof",
  "leak","hvac","heating","appliance","pest","mice","mold","contractor",
  "technician","estimate","tenant","unit","inspection",
];
const adminWords = [
  "compliance","registry","administrative","accounting","commission","meeting",
  "legal","eviction","renewal","insurance","reporting","filing","license","tax",
];

function parseCsv(text: string): Record<string,string>[] {
  const grid: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i], next = text[i + 1];
    if (c === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((c === "\r" || c === "\n") && !quoted) {
      if (c === "\r" && next === "\n") i += 1;
      row.push(cell); if (row.some((v) => v.trim())) grid.push(row); row = []; cell = "";
    } else cell += c;
  }
  row.push(cell); if (row.some((v) => v.trim())) grid.push(row);
  const headers = grid.shift()?.map((v) => v.trim()) || [];
  return grid.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() || ""])));
}

function pick(raw: Record<string,string>, names: string[]) {
  for (const [key, value] of Object.entries(raw)) {
    if (names.some((name) => key.trim().toLowerCase() === name.toLowerCase()) && value) return value;
  }
  return "";
}

function mapped(raw: Record<string,string>, id: number): Row {
  const title = pick(raw, ["Short description","Task Name","Task","Title","Subject"]) || `Imported record ${id + 1}`;
  const description = pick(raw, ["Description","Long description","Details","Instructions"]);
  const address = pick(raw, ["Property Address","Address","Property","Location"]);
  const vendor = pick(raw, ["Vendor","Vendor Name","Assigned To","Contractor"]);
  const category = pick(raw, ["Category","Task Category","Type"]);
  const searchable = `${title} ${description} ${address} ${vendor} ${category}`.toLowerCase();
  const maintenance = maintenanceWords.filter((word) => searchable.includes(word)).length + (vendor ? 2 : 0) + (address ? 1 : 0);
  const admin = adminWords.filter((word) => searchable.includes(word)).length;
  let route: Route = "review", reason = "No strong routing signal";
  if (maintenance >= 2 && maintenance > admin) { route = "maintenance"; reason = vendor ? "Vendor/property work detected" : "Maintenance work detected"; }
  else if (admin > maintenance || (title && maintenance === 0)) { route = "task_management"; reason = admin ? "Administrative work detected" : "General task"; }
  const priority = pick(raw, ["Priority"]).toLowerCase();
  const status = pick(raw, ["Status"]).toLowerCase();
  return {
    id, title, description, address, vendor, category,
    property: pick(raw, ["Property","Property Name"]) || address,
    unit: pick(raw, ["Unit","Unit Number"]),
    priority_code: priority.includes("high") || priority.includes("urgent") ? "high" : priority.includes("low") ? "low" : "medium",
    status_code: status.includes("progress") ? "in_progress" : status.includes("wait") ? "waiting" : status.includes("complete") || status.includes("closed") ? "completed" : "new",
    due_date: pick(raw, ["Due Date","Due"]),
    assignee: pick(raw, ["Assignee","Assigned To"]),
    department: pick(raw, ["Department"]), project: pick(raw, ["Project"]),
    notes: pick(raw, ["Notes","Latest Update","Comments"]),
    external_id: pick(raw, ["TaskId","Task ID","Work Order","Work Order Number","WO#"]),
    external_url: pick(raw, ["URL","Task URL","Work Order URL"]),
    route, reason,
  };
}

export default function DataControlPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("Choose a CSV export to begin.");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [distributionNotice, setDistributionNotice] = useState<{
    total: number;
    tasks: number;
    maintenance: number;
  } | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const counts = useMemo(() => ({
    tasks: rows.filter((r) => r.route === "task_management").length,
    maintenance: rows.filter((r) => r.route === "maintenance").length,
    review: rows.filter((r) => r.route === "review").length,
  }), [rows]);

  async function loadHistory() {
    try {
      const response = await fetch("/api/data-control/history", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setHistory(data.history || []);
    } catch {
      // The import controls remain usable if history is temporarily unavailable.
    }
  }

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => {
    if (!distributionNotice) return;
    const timer = window.setTimeout(() => setDistributionNotice(null), 10000);
    return () => window.clearTimeout(timer);
  }, [distributionNotice]);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const result = parseCsv(await file.text()).map(mapped);
    setFileName(file.name); setRows(result);
    setMessage(`Reviewed ${result.length} row(s). Confirm routing before import.`);
  }

  async function distribute() {
    if (counts.review) return setMessage(`Assign all ${counts.review} Needs Review row(s) first.`);
    setBusy(true); setMessage("Distributing records...");
    try {
      const response = await fetch("/api/data-control/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName, rows }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed.");
      setMessage(`Complete: ${data.task_management} to Task Management and ${data.maintenance} to Maintenance & Vendors.`);
      setDistributionNotice({
        total: Number(data.task_management || 0) + Number(data.maintenance || 0),
        tasks: Number(data.task_management || 0),
        maintenance: Number(data.maintenance || 0),
      });
      await loadHistory();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); }
    finally { setBusy(false); }
  }

  async function backup() {
    setBusy(true); setMessage("Preparing PDFs and document folders...");
    try {
      const service = frame.current?.contentWindow?.downloadUnifiedDocumentBackup;
      if (!service) throw new Error("Backup service is still loading. Try again.");
      const result = await service();
      setMessage(`Downloaded ${result.files} PDF documents in an organized ZIP.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Backup failed."); }
    finally { setBusy(false); }
  }

  return <main className="data-control-shell">
    <header className="data-control-header">
      <button onClick={() => { location.href = "/"; }}>← Dashboard</button>
      <div>
        <p>UNIFIED OPS · TECH ADMIN CONSOLE</p>
        <h1>Data Control</h1>
        <span>Import once, review routing, and distribute work.</span>
      </div>
      <button
        className="admin-access-badge"
        type="button"
        onClick={async () => {
          await fetch("/api/tech-admin/logout", { method: "POST" });
          window.location.href = "/tech-admin";
        }}
      >
        Sign out Tech Admin
      </button>
    </header>
    <section className="control-grid">
      <article className="control-card import-card">
        <div className="control-card-heading"><div><span>01</span><h2>Import and route tasks</h2></div>
          <label className="file-button">Choose CSV<input type="file" accept=".csv,text/csv" onChange={chooseFile}/></label>
        </div>
        <div className="route-summary">
          <div><strong>{rows.length}</strong><span>Total rows</span></div>
          <div className="route-task"><strong>{counts.tasks}</strong><span>Task Management</span></div>
          <div className="route-maintenance"><strong>{counts.maintenance}</strong><span>Maintenance</span></div>
          <div className="route-review"><strong>{counts.review}</strong><span>Needs review</span></div>
        </div>
        <div className="routing-table-wrap"><table className="routing-table">
          <thead><tr><th>Imported task</th><th>Routing reason</th><th>Destination</th></tr></thead>
          <tbody>{rows.length ? rows.slice(0,100).map((row) => <tr key={row.id}>
            <td><strong>{row.title}</strong><small>{row.address || row.vendor || "No property/vendor"}</small></td>
            <td>{row.reason}</td><td><select value={row.route} onChange={(e) => setRows((current) => current.map((item) => item.id === row.id ? {...item,route:e.target.value as Route,reason:"Manually selected"} : item))}>
              <option value="task_management">Task Management</option><option value="maintenance">Maintenance & Vendors</option><option value="review">Needs Review</option>
            </select></td>
          </tr>) : <tr><td colSpan={3} className="routing-empty">No CSV selected.</td></tr>}</tbody>
        </table></div>
        <button className="primary-control-button" disabled={busy || !rows.length} onClick={distribute}>
          {busy ? "Distributing Tasks..." : "Distribute Imported Tasks"}
        </button>
      </article>
      <article className="control-card backup-card">
        <div className="control-card-heading"><div><span>02</span><h2>Document backup</h2></div></div>
        <p>Download saved PDFs, photos, data, and a searchable index in one organized ZIP.</p>
        <div className="folder-preview"><strong>Unified-Ops-Backup/</strong><span>Work-Authorizations/</span><span>Owner-Approvals/</span><span>Quote-Requests/</span><span>Work-Verifications/</span><span>Photos/</span><span>Data/</span><span>backup-index.csv</span></div>
        <button className="primary-control-button backup-button" disabled={busy} onClick={backup}>Download Document Backup</button>
        <iframe ref={frame} className="backup-frame" src="/work-order-generator/index.html" title="Document backup service"/>
      </article>
    </section>
    <section className="control-card import-history-card">
      <div className="control-card-heading"><div><span>03</span><h2>Import history</h2></div>
        <button type="button" onClick={loadHistory}>Refresh history</button>
      </div>
      <div className="routing-table-wrap"><table className="routing-table">
        <thead><tr><th>Imported file</th><th>Date and time</th><th>Total</th><th>Task Management</th><th>Maintenance</th><th>Review</th></tr></thead>
        <tbody>{history.length ? history.map((item) => <tr key={item.id}>
          <td><strong>{item.file_name}</strong></td>
          <td>{new Date(item.created_at).toLocaleString()}</td>
          <td>{item.total_rows}</td><td>{item.task_management_rows}</td><td>{item.maintenance_rows}</td><td>{item.review_rows}</td>
        </tr>) : <tr><td colSpan={6} className="routing-empty">No completed imports recorded yet.</td></tr>}</tbody>
      </table></div>
    </section>
    <div className="control-message" role="status">{message}</div>
    {distributionNotice && (
      <aside className="distribution-notice" role="status" aria-live="assertive">
        <span className="distribution-notice-icon">✓</span>
        <div>
          <strong>Distribution complete</strong>
          <p>{distributionNotice.total} records were successfully updated in the shared database.</p>
          <small>
            {distributionNotice.tasks} Task Management · {distributionNotice.maintenance} Maintenance &amp; Vendors
          </small>
        </div>
        <button type="button" onClick={() => setDistributionNotice(null)} aria-label="Close notification">×</button>
      </aside>
    )}
  </main>;
}
