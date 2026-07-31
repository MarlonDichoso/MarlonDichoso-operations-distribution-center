const TABLE = "maintenance_tasks";
const PHOTO_BUCKET = "maintenance-photos";
const CONFIG_KEY = "mmh_supabase_config";
const DEFAULT_SUPABASE_URL = "https://toqfdhzlavkwjeukdtpg.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_fnjbFqunKe_XtswLrTh23g_SduXNxD-";

let client = null;
let tasks = [];
let currentView = "dashboard";
let showArchived = false;
let calendarDate = new Date();
let selectedVendor = "";
let selectedProperty = "";
let selectedPropertyUnit = "";
let deepLinkOpened = false;
let automaticRefreshTimer = null;

const $ = (id) => document.getElementById(id);
const els = {};

document.addEventListener("DOMContentLoaded", () => {
  [
    "statusLine","globalSearch","openSettings","settingsModal","settingsForm","supabaseUrl","supabaseKey","testConnection",
    "modalBackdrop","importModal","importForm","csvFile","importResult","taskModal","taskModalTitle","taskDetail","addModal","taskForm","editModal","editTaskForm","updatesModal","updatesForm","updatesTitle","updatesMeta","updatesList","estimatesModal","estimatesForm","estimatesTitle","estimatesMeta","estimatesList",
    "vendorList","vendorDirectory","vendorDetail","vendorDetailName","vendorDetailMeta","vendorBack","vendorTaskTable","downloadVendorPdf","downloadVendorSpreadsheet","propertyList","propertyDirectory","propertyDetail","propertyDetailName","propertyDetailMeta","propertyBack","propertyTotalCount","propertyOpenCount","propertyCompletedCount","propertyLastActivity","propertyTaskTable","calendarList","calendarTitle","calendarPrev","calendarToday","calendarNext","calendarClose","archivedTaskRows","archivedBack","statTotal","statOpen","statDueSoon","statWaiting","statArchived","mobileMore","mobileActions"
  ].forEach((id) => els[id] = $(id));

  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", handleCloseClick));
  document.querySelectorAll(".nav").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));

  if ($("openSettings")) $("openSettings").addEventListener("click", openSettings);
  $("openImport").addEventListener("click", () => openModal("importModal"));
  $("openAddTask").addEventListener("click", () => openModal("addModal"));
  $("refreshData").addEventListener("click", loadTasks);
  $("exportCsv").addEventListener("click", exportCsv);
  $("toggleArchived").addEventListener("click", () => switchView("archived"));
  els.calendarPrev.addEventListener("click", () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
  els.calendarToday.addEventListener("click", () => { calendarDate = new Date(); renderCalendar(); });
  els.calendarNext.addEventListener("click", () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
  els.calendarClose.addEventListener("click", () => switchView("dashboard"));
  els.calendarList.addEventListener("click", calendarAction);
  els.archivedBack.addEventListener("click", () => switchView("dashboard"));
  els.archivedTaskRows.addEventListener("click", archivedAction);
  els.mobileMore.addEventListener("click", () => els.mobileActions.classList.toggle("open"));
  els.globalSearch.addEventListener("input", render);
  els.settingsForm.addEventListener("submit", saveSettings);
  els.testConnection.addEventListener("click", testConnection);
  els.importForm.addEventListener("submit", importCsv);
  els.taskForm.addEventListener("submit", saveManualTask);
  els.editTaskForm.addEventListener("submit", saveEditedTask);
  els.updatesForm.addEventListener("submit", saveUpdateFromModal);
  els.estimatesForm.addEventListener("submit", saveEstimateFromModal);
  els.estimatesForm.addEventListener("input", estimateFormChanged);
  document.querySelectorAll("[data-dashboard-view]").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.dashboardView)));
  els.vendorList.addEventListener("click", vendorAction);
  els.vendorTaskTable.addEventListener("click", vendorAction);
  els.vendorBack.addEventListener("click", () => { selectedVendor = ""; renderVendors(); });
  els.propertyList.addEventListener("click", propertyAction);
  els.propertyTaskTable.addEventListener("click", propertyAction);
  els.propertyBack.addEventListener("click", () => {
    if (selectedPropertyUnit) {
      selectedPropertyUnit = "";
      renderPropertyDetail();
    } else {
      selectedProperty = "";
      renderProperties();
    }
  });

  loadConfig();
  render();
  if (client) {
    loadTasks();
    automaticRefreshTimer = window.setInterval(() => {
      const editing = document.querySelector(".modal:not([hidden])") ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (document.visibilityState === "visible" && !editing) loadTasks();
    }, 30000);
    window.addEventListener("focus", () => {
      const editing = document.querySelector(".modal:not([hidden])");
      if (!editing) loadTasks();
    });
  }
});

function loadConfig() {
  const config = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
  const url = DEFAULT_SUPABASE_URL || config.url || "";
  const key = DEFAULT_SUPABASE_KEY || config.key || "";
  if (els.supabaseUrl) els.supabaseUrl.value = url;
  if (els.supabaseKey) els.supabaseKey.value = key;
  if (url && key && window.supabase) {
    client = window.supabase.createClient(normalizeSupabaseUrl(url), key);
    setStatus("Connected to Maintenance Management Hub database.");
  } else if (DEFAULT_SUPABASE_URL && !DEFAULT_SUPABASE_KEY) {
    setStatus("Supabase publishable key is missing in app.js. Add it once to DEFAULT_SUPABASE_KEY, then upload app.js again.");
  }
}

function saveSettings(e) {
  e.preventDefault();
  const url = normalizeSupabaseUrl(els.supabaseUrl.value);
  const key = els.supabaseKey.value.trim();
  if (!isSupabaseProjectUrl(url)) {
    setStatus("Settings not saved: paste the Project URL that looks like https://your-project-id.supabase.co");
    return;
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
  client = window.supabase.createClient(url, key);
  closeModal();
  loadTasks();
}

async function testConnection() {
  try {
    const url = normalizeSupabaseUrl(els.supabaseUrl.value);
    if (!isSupabaseProjectUrl(url)) throw new Error("Paste the Project URL, not the Rest URL or dashboard URL.");
    const temp = window.supabase.createClient(url, els.supabaseKey.value.trim());
    const { error } = await temp.from(TABLE).select("id").limit(1);
    if (error) throw error;
    setStatus("Supabase connection works.");
  } catch (error) {
    setStatus(`Connection failed: ${error.message}`);
  }
}

async function loadTasks() {
  if (!client) return setStatus("Database is not connected. Add the Supabase publishable key in app.js.");
  setStatus("Loading maintenance tasks...");
  const { data, error } = await client.from(TABLE).select("*").order("updated_at", { ascending:false });
  if (error) return setStatus(`Load failed: ${error.message}`);
  tasks = (data || []).map(normalizeDbTask);
  setStatus(`Loaded ${maintenanceTasks().length} maintenance task(s).`);
  render();
  openDeepLinkedMaintenanceTask();
}

function openDeepLinkedMaintenanceTask() {
  if (deepLinkOpened) return;
  const record = new URLSearchParams(location.search).get("record");
  if (!record) return;
  const task = tasks.find((item) =>
    String(item.id) === record ||
    String(item.task_id || "") === record ||
    String(item.work_order_number || "") === record
  );
  if (!task) {
    setStatus(`The requested maintenance record ${record} was not found.`);
    return;
  }
  deepLinkOpened = true;
  openTask(task);
}

async function saveManualTask(e) {
  e.preventDefault();
  if (!client) return setStatus("Database is not connected. Add the Supabase publishable key in app.js.");
  const data = Object.fromEntries(new FormData(els.taskForm).entries());
  const taskId = String(data.task_id || "").trim();
  const task = {
    id:crypto.randomUUID(),
    source:"Manual",
    task_name:data.task_name,
    task_id:taskId || null,
    vendor_name:data.vendor_name || "Unassigned Work",
    work_order_number:taskId || null,
    work_order_url:data.work_order_url || buildBuildiumTaskUrl(taskId),
    property_address:buildPropertyAddress(data.property_name, data.unit_number),
    property_name:data.property_name || "No property address",
    unit_number:data.unit_number || "",
    category:data.category || "Maintenance Request",
    priority:data.priority || "Medium",
    due_date:data.due_date || null,
    status:data.status || "Open",
    notes:data.notes || ""
  };
  const { error } = await client.from(TABLE).insert(task);
  if (error) return setStatus(`Save failed: ${error.message}`);
  els.taskForm.reset();
  closeModal();
  await loadTasks();
}

async function importCsv(e) {
  e.preventDefault();
  if (!client) return setImport("Database is not connected. Add the Supabase publishable key in app.js.");
  const file = els.csvFile.files[0];
  if (!file) return setImport("Choose a Buildium CSV first.");
  setImport(`Reading ${file.name}...`);
  const text = await file.text();
  const rows = parseCsv(text);
  const vendorByTaskId = buildVendorMapFromRows(rows);
  const imported = rows.map(buildiumRowToTask).filter(Boolean).map((task) => {
    const csvVendor = vendorByTaskId.get(String(task.task_id || "").trim()) || vendorByTaskId.get(String(task.work_order_number || "").trim());
    return csvVendor ? { ...task, vendor_name:csvVendor } : task;
  });
  if (!imported.length) return setImport(`No maintenance rows found. ${rows.length} row(s) checked.`);
  const csvVendorCount = [...vendorByTaskId.values()].filter((vendor) => vendor !== "Unassigned Work").length;
  const importedVendorCount = imported.filter((task) => task.vendor_name && task.vendor_name !== "Unassigned Work").length;
  if (csvVendorCount && !importedVendorCount) {
    return setImport("Import stopped: the CSV has vendor names, but the app could not map them. Vendor column was protected from being overwritten.");
  }

  setImport(`Saving ${imported.length} maintenance task(s)...`);
  const existingByKey = buildPreserveMap(tasks);
  const nextRows = imported.map((task) => {
    const old = findPreservedTask(existingByKey, task);
    const importedVendor = normalizeVendor(task.vendor_name);
    const existingVendor = old ? normalizeVendor(old.vendor_name) : "Unassigned Work";
    const finalVendor = importedVendor === "Unassigned Work" && existingVendor !== "Unassigned Work" ? existingVendor : importedVendor;
    return old ? {
      ...task,
      id: old.id,
      vendor_name: finalVendor,
      updates: old.updates || [],
      estimates: old.estimates || [],
      photos: old.photos || [],
      linked_task_ids: old.linked_task_ids || [],
      created_at: old.created_at
    } : { ...task, id:crypto.randomUUID() };
  });

  const idsToKeep = nextRows.map((r) => r.id).filter(Boolean);
  if (idsToKeep.length) {
    const keepList = idsToKeep.map((id) => `"${id}"`).join(",");
    const { error: deleteError } = await client.from(TABLE).delete().not("id", "in", `(${keepList})`);
    if (deleteError) return setImport(`Replace failed: ${deleteError.message}`);
  } else {
    const { error: deleteAllError } = await client.from(TABLE).delete().not("id", "is", null);
    if (deleteAllError) return setImport(`Replace failed: ${deleteAllError.message}`);
  }

  const { error } = await client.from(TABLE).upsert(nextRows, { onConflict:"id" });
  if (error) return setImport(`Import failed: ${error.message}`);
  const vendorSummary = summarizeVendors(nextRows);
  setImport(`Imported ${nextRows.length} maintenance task(s). Vendors found: ${vendorSummary}`);
  await loadTasks();
}

function render() {
  renderStats();
  renderVendors();
  renderProperties();
  renderCalendar();
  renderArchived();
}

function maintenanceTasks() {
  return tasks.filter(isAllowedMaintenanceTask);
}

function isAllowedMaintenanceTask(task) {
  const category = String(task.category || "").toLowerCase();
  return !/accounting|administration|management|legal|general inquiry|inquiry|question|suggestion|feedback|leasing/.test(category);
}

function filteredTasks() {
  const q = els.globalSearch.value.trim().toLowerCase();
  const status = "all";
  return maintenanceTasks().filter((t) => {
    if (!showArchived && t.archived) return false;
    if (status !== "all" && t.status !== status) return false;
    const text = `${t.task_name} ${t.task_id || ""} ${t.vendor_name || ""} ${t.property_address || ""} ${t.category || ""} ${t.notes || ""}`.toLowerCase();
    return !q || text.includes(q);
  });
}

function renderStats() {
  const rows = maintenanceTasks();
  const active = rows.filter((t) => !t.archived);
  els.statTotal.textContent = active.length;
  els.statOpen.textContent = active.filter((t) => t.status !== "Completed").length;
  els.statDueSoon.textContent = active.filter((t) => t.status !== "Completed" && dueClass(t)).length;
  els.statWaiting.textContent = active.filter((t) => String(t.status).startsWith("Waiting")).length;
  els.statArchived.textContent = rows.filter((t) => t.archived).length;
}

function taskRow(t) {
  return `<tr>
    <td data-label="Task ID">${taskIdLink(t)}</td>
    <td data-label="Maintenance Task"><button class="linklike" data-action="view" data-id="${t.id}">${esc(t.task_name)}</button></td>
    <td data-label="Property">${esc(t.property_address || "")}</td>
    <td data-label="Vendor">${esc(t.vendor_name || "Unassigned Work")}</td>
    <td data-label="Priority"><span class="pill priority-${safeClass(t.priority)}">${esc(t.priority)}</span></td>
    <td data-label="Due" class="${dueClass(t)}">${formatDate(t.due_date)}</td>
    <td data-label="Status"><span class="pill status-${safeClass(t.status)}">${esc(t.status)}</span></td>
    <td data-label="Actions"><div class="row-actions"><button data-action="view" data-id="${t.id}">Open</button><button class="secondary" data-action="done" data-id="${t.id}">Done</button><button class="danger" data-action="archive" data-id="${t.id}">Archive</button></div></td>
  </tr>`;
}

function taskIdLink(t) {
  const label = esc(t.task_id || t.work_order_number || "No Task ID");
  const url = t.work_order_url || buildBuildiumTaskUrl(t.task_id || t.work_order_number);
  return url ? `<a class="linklike" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>` : label;
}

function renderArchived() {
  const rows = maintenanceTasks().filter((t) => t.archived);
  els.archivedTaskRows.innerHTML = rows.length ? rows.map(archivedTaskRow).join("") : `<tr><td colspan="9">No archived maintenance tasks yet.</td></tr>`;
}

function archivedTaskRow(t) {
  return `<tr>
    <td data-label="Task ID">${taskIdLink(t)}</td>
    <td data-label="Maintenance Task"><button class="linklike" data-action="view" data-id="${esc(t.id)}" type="button">${esc(t.task_name || "Untitled Maintenance Task")}</button></td>
    <td data-label="Property">${esc(t.property_address || "")}</td>
    <td data-label="Vendor">${esc(t.vendor_name || "Unassigned Work")}</td>
    <td data-label="Priority"><span class="pill priority-${safeClass(t.priority)}">${esc(t.priority || "")}</span></td>
    <td data-label="Due">${formatDate(t.due_date)}</td>
    <td data-label="Status"><span class="pill status-${safeClass(t.status)}">${esc(t.status || "")}</span></td>
    <td data-label="Archived">${formatDateTime(t.archived_at)}</td>
    <td data-label="Actions"><div class="row-actions"><button data-action="view" data-id="${esc(t.id)}" type="button">Open</button><button class="secondary" data-action="restore" data-id="${esc(t.id)}" type="button">Restore</button><button class="danger" data-action="delete" data-id="${esc(t.id)}" type="button">Delete</button></div></td>
  </tr>`;
}

function renderVendors() {
  if (selectedVendor) return renderVendorDetail();
  els.vendorDirectory.hidden = false;
  els.vendorDetail.hidden = true;
  const groups = groupBy(maintenanceTasks().filter((t) => !t.archived), (t) => t.vendor_name || "Unassigned Work");
  els.vendorList.innerHTML = [...groups.entries()].sort().map(([vendor, rows]) =>
    `<button class="list-card vendor-card" data-action="view-vendor" data-vendor="${esc(vendor)}"><span><strong>${esc(vendor)}</strong><small>${rows.length} active maintenance task(s)</small></span><b>${rows.length}</b></button>`
  ).join("") || `<p class="hint">No vendors yet.</p>`;
}

function renderVendorDetail() {
  const rows = maintenanceTasks().filter((t) => !t.archived && (t.vendor_name || "Unassigned Work") === selectedVendor);
  const open = rows.filter((t) => t.status !== "Completed").length;
  const waiting = rows.filter((t) => String(t.status || "").startsWith("Waiting")).length;
  const completed = rows.filter((t) => t.status === "Completed").length;
  els.vendorDirectory.hidden = true;
  els.vendorDetail.hidden = false;
  els.vendorDetailName.textContent = selectedVendor;
  els.vendorDetailMeta.textContent = `${rows.length} assigned maintenance task(s) | ${open} open | ${waiting} waiting | ${completed} completed`;
  els.vendorTaskTable.innerHTML = rows.length ? rows.map(vendorTaskRow).join("") : `<tr><td colspan="9" class="inline-vendor-empty">No assigned maintenance tasks for this vendor.</td></tr>`;
}

function vendorTaskRow(t) {
  return `<tr>
    <td>${taskIdLink(t)}</td>
    <td><button class="linklike" data-action="view" data-id="${esc(t.id)}" type="button">${esc(t.task_name || "Untitled Maintenance Task")}</button></td>
    <td>${esc(t.property_address || "")}</td>
    <td>${esc(t.category || "")}</td>
    <td><span class="pill priority-${safeClass(t.priority)}">${esc(t.priority || "")}</span></td>
    <td class="${dueClass(t)}">${formatDate(t.due_date)}</td>
    <td><span class="pill status-${safeClass(t.status)}">${esc(t.status || "")}</span></td>
    <td>${esc(t.notes || "")}</td>
    <td><div class="row-actions"><button data-action="edit" data-id="${esc(t.id)}" type="button">Edit</button><button class="secondary" data-action="done" data-id="${esc(t.id)}" type="button">Done</button><button class="danger" data-action="archive" data-id="${esc(t.id)}" type="button">Delete</button></div></td>
  </tr>`;
}

function renderProperties() {
  if (selectedProperty) return renderPropertyDetail();
  els.propertyDirectory.hidden = false;
  els.propertyDetail.hidden = true;
  const groups = groupBy(maintenanceTasks().filter((t) => !t.archived), (t) => propertyRoot(t.property_address || t.property_name));
  els.propertyList.innerHTML = [...groups.entries()].sort().map(([property, rows]) => {
    const units = new Set(rows.map((r) => unitPart(r.property_address)).filter(Boolean));
    const open = rows.filter((t) => t.status !== "Completed").length;
    return `<button class="list-card property-card" data-action="view-property" data-property="${esc(property)}"><span><strong>${esc(property)}</strong><small>${rows.length} total | ${open} active</small><em class="property-level-badge">Property</em></span><b>${rows.length}</b></button>`;
  }).join("") || `<p class="hint">No properties yet.</p>`;
}

function renderPropertyDetail() {
  const rows = maintenanceTasks().filter((t) => !t.archived && propertyRoot(t.property_address || t.property_name) === selectedProperty);
  const currentRows = selectedPropertyUnit ? rows.filter((t) => unitPart(t.property_address) === selectedPropertyUnit) : rows;
  const open = currentRows.filter((t) => t.status !== "Completed").length;
  const completed = currentRows.filter((t) => t.status === "Completed").length;
  const latest = latestActivity(currentRows);
  els.propertyDirectory.hidden = true;
  els.propertyDetail.hidden = false;
  els.propertyDetailName.textContent = selectedPropertyUnit ? `${selectedProperty} - Unit ${selectedPropertyUnit}` : selectedProperty;
  els.propertyDetailMeta.textContent = selectedPropertyUnit
    ? `${currentRows.length} maintenance task(s) / maintenance record(s) | ${open} active | ${completed} completed`
    : `${rows.length} maintenance task(s) / maintenance record(s) | ${open} active | ${completed} completed`;
  els.propertyTotalCount.textContent = currentRows.length;
  els.propertyOpenCount.textContent = open;
  els.propertyCompletedCount.textContent = completed;
  els.propertyLastActivity.textContent = latest ? formatDateTime(latest) : "-";
  els.propertyTaskTable.innerHTML = selectedPropertyUnit
    ? renderPropertyUnitRows(selectedProperty, selectedPropertyUnit, currentRows)
    : renderPropertyOverviewRows(selectedProperty, rows);
}

function renderPropertyOverviewRows(property, rows) {
  const propertyRows = rows.filter((t) => !unitPart(t.property_address));
  const unitMap = groupBy(rows.filter((t) => unitPart(t.property_address)), (t) => unitPart(t.property_address));
  let html = `<tr class="property-tree-row"><td colspan="10">${esc(property)} - Property Level Maintenance Tasks</td></tr>`;
  html += propertyRows.length
    ? propertyRows.map(propertyTaskRow).join("")
    : `<tr class="property-tree-empty"><td colspan="10">No property-level maintenance tasks.</td></tr>`;
  html += `<tr class="property-tree-row unit"><td colspan="10">Units</td></tr>`;
  const units = [...unitMap.keys()].sort((a,b) => String(a).localeCompare(String(b), undefined, { numeric:true }));
  html += units.length ? units.map((unit) => {
    const unitRows = unitMap.get(unit);
    const open = unitRows.filter((t) => t.status !== "Completed").length;
    return `<tr><td colspan="10"><button class="property-unit-button" data-action="view-property-unit" data-unit="${esc(unit)}" type="button">⌂ Unit ${esc(unit)}</button> <span class="meta">${unitRows.length} maintenance task(s) | ${open} active</span></td></tr>`;
  }).join("") : `<tr class="property-tree-empty"><td colspan="10">No unit-level maintenance tasks.</td></tr>`;
  return html;
}

function renderPropertyUnitRows(property, unit, rows) {
  let html = `<tr class="property-back-row"><td colspan="10"><button class="secondary" data-action="back-property" type="button">&lt; Back to ${esc(property)}</button></td></tr>`;
  html += `<tr class="property-tree-row unit"><td colspan="10">Unit ${esc(unit)} - Unit Level Maintenance Tasks</td></tr>`;
  html += rows.length ? rows.map(propertyTaskRow).join("") : `<tr class="property-tree-empty"><td colspan="10">No maintenance tasks for this unit.</td></tr>`;
  return html;
}

function propertyTaskRow(t) {
  return `<tr>
    <td>${taskIdLink(t)}</td>
    <td><button class="linklike" data-action="view" data-id="${esc(t.id)}" type="button">🔍 ${esc(t.task_name || "Untitled Maintenance Task")}</button></td>
    <td>${esc(t.vendor_name || "Unassigned Work")}</td>
    <td>${esc(t.category || "")}</td>
    <td><span class="pill priority-${safeClass(t.priority)}">${esc(t.priority || "")}</span></td>
    <td class="${dueClass(t)}">${formatDate(t.due_date)}</td>
    <td><span class="pill status-${safeClass(t.status)}">${esc(t.status || "")}</span></td>
    <td>${formatDateTime(t.updated_at || t.created_at)}</td>
    <td>${esc(t.notes || "")}</td>
    <td><div class="row-actions"><button data-action="edit" data-id="${esc(t.id)}" type="button">Edit</button><button class="secondary" data-action="done" data-id="${esc(t.id)}" type="button">Done</button><button class="danger" data-action="archive" data-id="${esc(t.id)}" type="button">Delete</button></div></td>
  </tr>`;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const monthLabel = calendarDate.toLocaleDateString("en-US", { month:"long", year:"numeric" });
  const todayKey = dateKey(new Date());
  const rowsByDate = groupBy(maintenanceTasks().filter((t) => !t.archived && t.due_date), (t) => t.due_date);
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  let html = dayNames.map((day) => `<div class="calendar-day-name">${day}</div>`).join("");
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = dateKey(date);
    const items = (rowsByDate.get(key) || []).sort((a,b) => String(a.task_name).localeCompare(String(b.task_name)));
    const muted = date.getMonth() !== month ? " muted" : "";
    const today = key === todayKey ? " today" : "";
    html += `<div class="calendar-day${muted}">
      <div class="calendar-date${today}">${date.getDate()}</div>
      <div class="calendar-items">${items.map(renderCalendarItem).join("")}</div>
    </div>`;
  }
  els.calendarTitle.textContent = monthLabel;
  els.calendarList.innerHTML = html;
}

function renderCalendarItem(task) {
  const status = String(task.status || "").toLowerCase();
  const overdue = task.status !== "Completed" && task.due_date && new Date(`${task.due_date}T00:00:00`) < startOfDay(new Date());
  const stateClass = overdue ? " status-overdue" : status === "completed" ? " status-completed" : status.includes("waiting") ? " status-waiting" : "";
  return `<button class="calendar-item${stateClass}" data-action="calendar-view" data-id="${esc(task.id)}" type="button"><strong><span class="btn-icon">📅</span>${esc(task.task_id || task.work_order_number || "No Task ID")} - ${esc(task.task_name || "")}</strong><span>${esc(task.vendor_name || "Unassigned Work")} | ${esc(task.status || "")}</span></button>`;
}

function calendarAction(e) {
  const button = e.target.closest("button[data-action='calendar-view']");
  if (!button) return;
  const task = tasks.find((t) => t.id === button.dataset.id);
  if (task) openTask(task);
}

async function tableAction(e) {
  const b = e.target.closest("button[data-action]");
  if (!b) return;
  const task = tasks.find((t) => t.id === b.dataset.id);
  if (!task) return;
  if (b.dataset.action === "view") openTask(task);
  if (b.dataset.action === "edit") openEditTask(task);
  if (b.dataset.action === "done") await updateTask(task.id, { status:"Completed" });
  if (b.dataset.action === "archive") await updateTask(task.id, { archived:true, archived_at:new Date().toISOString() });
}

async function archivedAction(e) {
  const b = e.target.closest("button[data-action]");
  if (!b) return;
  const task = tasks.find((t) => t.id === b.dataset.id);
  if (!task) return;
  if (b.dataset.action === "view") openTask(task);
  if (b.dataset.action === "restore") await updateTask(task.id, { archived:false, archived_at:null });
  if (b.dataset.action === "delete") await deleteTask(task.id);
}

function listAction(e) {
  const b = e.target.closest("button[data-action]");
  if (!b) return;
  els.globalSearch.value = b.dataset.value;
  switchView("dashboard");
  render();
}

async function vendorAction(e) {
  const b = e.target.closest("button[data-action]");
  if (!b) return;
  if (b.dataset.action === "view-vendor") {
    selectedVendor = b.dataset.vendor;
    renderVendorDetail();
    return;
  }
  const task = tasks.find((t) => t.id === b.dataset.id);
  if (!task) return;
  if (b.dataset.action === "view") openTask(task);
  if (b.dataset.action === "edit") openEditTask(task);
  if (b.dataset.action === "done") await updateTask(task.id, { status:"Completed" });
  if (b.dataset.action === "archive") await updateTask(task.id, { archived:true, archived_at:new Date().toISOString() });
  if (selectedVendor) renderVendorDetail();
}

async function propertyAction(e) {
  const b = e.target.closest("button[data-action]");
  if (!b) return;
  if (b.dataset.action === "view-property") {
    selectedProperty = b.dataset.property;
    selectedPropertyUnit = "";
    renderPropertyDetail();
    return;
  }
  if (b.dataset.action === "view-property-unit") {
    selectedPropertyUnit = b.dataset.unit;
    renderPropertyDetail();
    return;
  }
  if (b.dataset.action === "back-property") {
    selectedPropertyUnit = "";
    renderPropertyDetail();
    return;
  }
  const task = tasks.find((t) => t.id === b.dataset.id);
  if (!task) return;
  if (b.dataset.action === "view") openTask(task);
  if (b.dataset.action === "edit") openEditTask(task);
  if (b.dataset.action === "done") await updateTask(task.id, { status:"Completed" });
  if (b.dataset.action === "archive") await updateTask(task.id, { archived:true, archived_at:new Date().toISOString() });
  if (selectedProperty) renderPropertyDetail();
}

function openTask(t) {
  els.taskModalTitle.textContent = "Maintenance Portal";
  const firstPhoto = (t.photos || [])[0]?.url;
  const taskUrl = t.work_order_url || buildBuildiumTaskUrl(t.task_id || t.work_order_number);
  els.taskDetail.innerHTML = `<div class="portal-crumb">Home / Maintenance Requests / Maintenance Request / ${esc(t.property_address || "Property")} / ${esc(t.task_id || "")}</div>
  <div class="portal-subhead">
    <h2>${esc(t.task_name)}</h2>
    <div class="portal-tools">
      <button type="button" data-focus-estimate>Estimate</button>
      <button type="button" class="tool-link">Email</button>
      <button type="button" class="tool-link" data-estimate-report>Preview Estimate Report</button>
    </div>
  </div>
  <div class="detail-top portal-summary">
    <div class="photo-box">${firstPhoto ? `<img src="${esc(firstPhoto)}" alt="">` : `<div class="photo-empty"><strong>No photo uploaded</strong><button type="button">Add<br>Photos</button></div>`}</div>
    <div class="detail-grid">
      <div class="kv property-block"><span>Property</span><strong>${esc(t.property_address || "")}</strong><small>TASK ID: ${taskIdLink(t)}</small></div>
      <div class="kv"><span>Vendor</span><strong>${esc(t.vendor_name || "Unassigned Work")}</strong><small>Assigned vendor</small></div>
      <div class="kv"><span>Type</span><small>Category</small><strong>${esc(t.category || "")}</strong></div>
      <div class="kv"><span>Status</span><strong>${esc(t.status)}</strong></div>
      <div class="kv"><span>Priority</span><strong>${esc(t.priority)}</strong></div>
      <div class="kv"><span>Due By</span><strong>${formatDate(t.due_date)}</strong></div>
      <div class="kv"><span>Maintenance Task URL</span><strong>${taskUrl ? `<a class="linklike" href="${esc(taskUrl)}" target="_blank" rel="noopener">${esc(taskUrl)}</a>` : "No URL"}</strong></div>
    </div>
  </div>
  <div class="detail-body">
    <div class="box description-updates">
      <h3>Description and Updates</h3>
      <div class="description-panel"><span>Description</span><p>${esc(t.notes || "No description.")}</p></div>
      <div class="updates-scroll">
        ${(t.updates || []).map((u, index) => `<div class="update-card"><div><span><strong>Update</strong><small>${formatDateTime(u.created_at)}</small></span><button type="button" class="secondary" data-edit-update="${index}">Edit</button></div><p>${esc(u.message || "")}</p></div>`).join("") || "<p class='hint'>No updates yet.</p>"}
      </div>
    </div>
    <div class="box linked-panel">
      <h3>Linked Maintenance Tasks</h3>
      <select><option>Select maintenance task to link</option></select>
      <button type="button">Link Maintenance Task</button>
      <p class="hint">No linked maintenance tasks yet.</p>
    </div>
  </div>`;
  els.taskDetail.querySelectorAll("[data-edit-update]").forEach((button) => button.addEventListener("click", () => editUpdate(t.id, Number(button.dataset.editUpdate))));
  els.taskDetail.querySelector("[data-focus-estimate]")?.addEventListener("click", () => openEstimatesTask(t));
  els.taskDetail.querySelector("[data-estimate-report]")?.addEventListener("click", () => printEstimateReport(t));
  $("taskHeaderUpdate").onclick = () => {
    openUpdatesTask(t);
  };
  $("taskHeaderEdit").onclick = () => openEditTask(t);
  openModal("taskModal");
}

function openEditTask(task) {
  const form = els.editTaskForm;
  form.elements.id.value = task.id || "";
  form.elements.vendor_name.value = task.vendor_name || "";
  form.elements.task_id.value = task.task_id || task.work_order_number || "";
  form.elements.work_order_url.value = task.work_order_url || buildBuildiumTaskUrl(task.task_id || task.work_order_number);
  form.elements.task_name.value = task.task_name || "";
  form.elements.property_name.value = task.property_name || propertyRoot(task.property_address || "");
  form.elements.unit_number.value = task.unit_number || unitPart(task.property_address || "");
  form.elements.category.value = task.category || "";
  form.elements.priority.value = task.priority || "Medium";
  form.elements.due_date.value = task.due_date || "";
  form.elements.status.value = task.status || "Open";
  form.elements.notes.value = task.notes || "";
  openModal("editModal");
}

async function saveEditedTask(e) {
  e.preventDefault();
  if (!client) return setStatus("Database is not connected. Add the Supabase publishable key in app.js.");
  const data = Object.fromEntries(new FormData(els.editTaskForm).entries());
  const taskId = String(data.task_id || "").trim();
  const patch = {
    vendor_name:data.vendor_name || "Unassigned Work",
    task_id:taskId || null,
    work_order_number:taskId || null,
    work_order_url:data.work_order_url || buildBuildiumTaskUrl(taskId),
    task_name:data.task_name || "Untitled Maintenance Task",
    property_address:buildPropertyAddress(data.property_name, data.unit_number),
    property_name:data.property_name || "No property address",
    unit_number:data.unit_number || "",
    category:data.category || "Maintenance Request",
    priority:data.priority || "Medium",
    due_date:data.due_date || null,
    status:data.status || "Open",
    notes:data.notes || "",
    updated_at:new Date().toISOString()
  };
  await updateTask(data.id, patch);
  const updated = tasks.find((t) => t.id === data.id);
  if (!els.taskModal.hidden) {
    els.editModal.hidden = true;
    if (updated) openTask(updated);
  } else {
    closeModal();
  }
}

function openUpdatesTask(task) {
  els.updatesForm.elements.id.value = task.id || "";
  els.updatesForm.elements.message.value = "";
  els.updatesTitle.textContent = "Work Order Updates";
  els.updatesMeta.textContent = `${task.task_name || ""} | ${task.task_id || task.work_order_number || "No Task ID"} | ${(task.updates || []).length} update(s)`;
  els.updatesList.innerHTML = renderUpdateModalList(task);
  openModal("updatesModal");
}

function renderUpdateModalList(task) {
  return (task.updates || []).map((u, index) => `<div class="update-card"><div><span><strong>Update</strong><small>${formatDateTime(u.created_at)}</small></span><button type="button" class="secondary" onclick="editUpdate('${esc(task.id)}', ${index})">Edit</button></div><p>${esc(u.message || "")}</p></div>`).join("") || `<p class="hint">No updates yet.</p>`;
}

async function saveUpdateFromModal(e) {
  e.preventDefault();
  const id = els.updatesForm.elements.id.value;
  const task = tasks.find((t) => t.id === id);
  const message = els.updatesForm.elements.message.value;
  if (!message) return;
  const updates = [{ message, created_at:new Date().toISOString() }, ...(task.updates || [])];
  await updateTask(id, { updates });
  const updated = tasks.find((t) => t.id === id);
  if (updated) {
    openTask(updated);
    openUpdatesTask(updated);
  }
}

async function editUpdate(taskId, updateIndex) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.updates?.[updateIndex]) return;
  const nextMessage = prompt("Edit update", task.updates[updateIndex].message || "");
  if (nextMessage === null) return;
  const updates = [...task.updates];
  updates[updateIndex] = { ...updates[updateIndex], message:nextMessage, edited_at:new Date().toISOString() };
  await updateTask(taskId, { updates });
  openTask(tasks.find((t) => t.id === taskId));
}

async function addEstimate(e) {
  e.preventDefault();
  const id = e.currentTarget.dataset.estimateForm;
  const task = tasks.find((t) => t.id === id);
  const data = Object.fromEntries(new FormData(e.currentTarget).entries());
  const estimates = [{ ...data, amount:Number(data.amount || 0), created_at:new Date().toISOString() }, ...(task.estimates || [])];
  await updateTask(id, { estimates });
  openTask(tasks.find((t) => t.id === id));
}

function openEstimatesTask(task) {
  els.estimatesForm.reset();
  els.estimatesForm.elements.id.value = task.id || "";
  els.estimatesForm.elements.status.value = "Pending";
  els.estimatesForm.elements.line_qty.value = "1";
  els.estimatesForm.elements.line_unit_cost.value = "0.00";
  els.estimatesForm.elements.amount.value = "0.00";
  els.estimatesTitle.textContent = "Vendor Estimates";
  els.estimatesMeta.textContent = `${task.task_name || ""} | ${task.task_id || task.work_order_number || "No Task ID"} | ${(task.estimates || []).length} estimate(s)`;
  els.estimatesList.innerHTML = renderEstimateModalList(task);
  els.estimatesList.querySelectorAll("[data-print-estimate]").forEach((button) => {
    button.addEventListener("click", () => printEstimateReport(task));
  });
  els.estimatesList.querySelectorAll("[data-delete-estimate]").forEach((button) => {
    button.addEventListener("click", () => deleteEstimate(task, Number(button.dataset.deleteEstimate)));
  });
  els.estimatesList.querySelectorAll("[data-open-attachment]").forEach((button) => {
    button.addEventListener("click", () => openEstimateAttachment(
      task,
      Number(button.dataset.estimateIndex),
      Number(button.dataset.openAttachment)
    ));
  });
  openModal("estimatesModal");
}

function estimateFormChanged(e) {
  if (!["line_qty", "line_unit_cost"].includes(e.target.name)) return;
  const qty = Number(els.estimatesForm.elements.line_qty.value || 0);
  const unitCost = Number(els.estimatesForm.elements.line_unit_cost.value || 0);
  els.estimatesForm.elements.amount.value = (qty * unitCost).toFixed(2);
}

function renderEstimateModalList(task) {
  const estimates = task.estimates || [];
  return estimates.length ? estimates.map((estimate) => {
    const detail = (estimate.details || [])[0] || {};
    return `<div class="estimate-card">
      <div class="estimate-card-head">
        <div><strong>${esc(estimate.vendor || "Vendor")}</strong><small>${formatDateTime(estimate.created_at)}</small></div>
        <div class="estimate-card-actions">
          <span class="pill status-${safeClass(estimate.status || "Pending")}">${esc(estimate.status || "Pending")}</span>
          <button type="button" class="secondary" data-print-estimate>Preview Estimate Report</button>
          <button type="button" class="danger-button" data-delete-estimate="${estimates.indexOf(estimate)}">Delete Estimate</button>
        </div>
      </div>
      <table class="estimate-lines">
        <thead><tr><th>Description</th><th>Qty</th><th>Unit Cost</th><th>Total Amount</th></tr></thead>
        <tbody><tr><td>${esc(detail.description || estimate.notes || "")}</td><td>${esc(detail.qty ?? "")}</td><td>${money(detail.unit_cost)}</td><td>${money(estimate.amount)}</td></tr></tbody>
      </table>
      ${estimate.notes ? `<p>${esc(estimate.notes)}</p>` : ""}
      ${(estimate.attachments || []).length ? `<div class="estimate-attachments">
        <strong>Attached quote document${estimate.attachments.length > 1 ? "s" : ""}</strong>
        ${estimate.attachments.map((attachment, attachmentIndex) => `<button
          type="button"
          class="attachment-link"
          data-estimate-index="${estimates.indexOf(estimate)}"
          data-open-attachment="${attachmentIndex}"
        >📎 ${esc(attachment.name || "Quote attachment")}</button>`).join("")}
      </div>` : ""}
    </div>`;
  }).join("") : `<p class="hint">No vendor estimates yet.</p>`;
}

async function deleteEstimate(task, estimateIndex) {
  const estimate = task.estimates?.[estimateIndex];
  if (!estimate) return;
  const vendor = estimate.vendor || task.vendor_name || "this vendor";
  const approved = confirm(
    `Delete the ${money(estimate.amount || 0)} estimate from ${vendor}?\n\nThis removes only this estimate and cannot be undone.`
  );
  if (!approved) return;
  const estimates = task.estimates.filter((_, index) => index !== estimateIndex);
  const saved = await updateTask(task.id, { estimates });
  if (!saved) return;
  const attachmentPaths = (estimate.attachments || []).map((attachment) => attachment.path).filter(Boolean);
  if (attachmentPaths.length && client) {
    await client.storage.from(PHOTO_BUCKET).remove(attachmentPaths);
  }
  const updated = tasks.find((item) => item.id === task.id);
  if (updated) openEstimatesTask(updated);
  setStatus(`Estimate from ${vendor} deleted.`);
}

async function printEstimateReport(task) {
  const estimates = task.estimates || [];
  if (!estimates.length) {
    alert("Add an estimate before creating the estimate report.");
    return;
  }
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    alert("Allow pop-ups to open the estimate report.");
    return;
  }
  const reportNumber = task.task_id || task.work_order_number || task.id || "N/A";
  const estimateRows = estimates.flatMap((estimate, estimateNumber) => {
    const details = estimate.details?.length ? estimate.details : [{
      description: estimate.notes || "Estimate",
      qty: 1,
      unit_cost: estimate.amount || 0,
      total: estimate.amount || 0
    }];
    return details.map((line) => {
      const quantity = Number(line.qty || 0);
      const unitCost = Number(line.unit_cost || 0);
      const total = Number(line.total ?? quantity * unitCost);
      return `<tr>
        <td>${esc(estimate.vendor || task.vendor_name || "Vendor")}</td>
        <td>${esc(line.description || estimate.notes || "")}</td>
        <td class="number">${quantity}</td>
        <td class="number">${money(unitCost)}</td>
        <td class="number">${money(total)}</td>
        <td>${esc(estimate.status || "Pending")}</td>
      </tr>`;
    });
  }).join("");
  const reportAttachments = [];
  for (const estimate of estimates) {
    for (const attachment of estimate.attachments || []) {
      let url = "";
      if (attachment.path && client) {
        const { data } = await client.storage.from(PHOTO_BUCKET).createSignedUrl(attachment.path, 3600);
        url = data?.signedUrl || "";
      }
      reportAttachments.push({
        vendor: estimate.vendor || task.vendor_name || "Vendor",
        name: attachment.name || "Quote attachment",
        url
      });
    }
  }
  const comparisonRows = estimates.map((estimate) => `<tr>
    <td>${esc(estimate.vendor || task.vendor_name || "Vendor")}</td>
    <td class="number quote-amount">${money(estimate.amount || 0)}</td>
    <td>${esc(estimate.status || "Pending")}</td>
    <td>${esc(formatDateTime(estimate.created_at) || "Not recorded")}</td>
    <td>${esc(estimate.notes || "—")}</td>
  </tr>`).join("");
  const notes = estimates.map((estimate) => estimate.notes).filter(Boolean).join("\n");
  const attachmentRows = reportAttachments.length
    ? reportAttachments.map((attachment) => `<tr>
        <td>${esc(attachment.vendor)}</td>
        <td>${attachment.url ? `<a href="${esc(attachment.url)}" target="_blank">${esc(attachment.name)}</a>` : esc(attachment.name)}</td>
      </tr>`).join("")
    : `<tr><td colspan="2">No quote documents attached.</td></tr>`;
  reportWindow.document.write(`<!doctype html>
  <html><head><meta charset="utf-8"><title>Estimate Report ${esc(reportNumber)}</title>
  <style>
    @page{size:letter;margin:.55in}*{box-sizing:border-box}body{margin:0;color:#10233f;font-family:Arial,sans-serif;font-size:12px}
    .report{max-width:950px;margin:auto}.eyebrow{color:#2864ad;font-size:11px;font-weight:800;letter-spacing:1.7px;margin:0 0 8px}
    h1{font-size:30px;letter-spacing:.5px;margin:0}.subtitle{color:#52647d;margin:6px 0 20px}.rule{border-top:3px solid #2864ad;margin-bottom:20px}
    .meta{border-collapse:collapse;table-layout:fixed;width:100%;margin:0 0 28px;break-inside:avoid}
    .meta th,.meta td{border:1px solid #b8c5d6;height:40px;line-height:1.35;padding:9px 12px;text-align:left;vertical-align:middle}
    .meta th{background:#dceafa;color:#174b88;font-size:10px;text-transform:uppercase;letter-spacing:.6px}
    .meta td{background:#fff;color:#10233f;font-size:12px;overflow-wrap:anywhere}
    .lines{border-collapse:collapse;width:100%;margin-top:8px}.lines th,.lines td{border:1px solid #9eacbf;padding:9px;vertical-align:top}
    .lines th{background:#123660;color:white;font-size:10px;text-align:left;text-transform:uppercase;letter-spacing:.5px}
    .lines thead{display:table-header-group}.lines tr{break-inside:avoid}
    .number{text-align:right!important;white-space:nowrap}.quote-amount{color:#123660;font-size:15px;font-weight:800}.section-title{break-after:avoid;color:#174b88;font-size:15px;margin:24px 0 9px}
    .notes{border:1px solid #b8c5d6;margin-top:18px;padding:12px;min-height:70px;white-space:pre-wrap}.notes strong{display:block;color:#174b88;margin-bottom:6px}
    .footer{border-top:1px solid #c8d1dd;color:#6b7788;font-size:10px;margin-top:35px;padding-top:10px;display:flex;justify-content:space-between}
    .actions{margin:0 auto 18px;max-width:950px;text-align:right}.actions button{background:#174b88;border:0;border-radius:5px;color:white;cursor:pointer;padding:10px 16px;font-weight:700}
    @media print{.actions{display:none}}
  </style></head><body>
  <div class="actions">
    <button onclick="window.opener.downloadEstimateReportWithAttachments('${esc(String(task.id || ""))}', window)">Open Complete PDF</button>
    <button onclick="window.print()">Print Comparison Page Only</button>
  </div>
  <main class="report">
    <p class="eyebrow">MAINTENANCE MANAGEMENT HUB</p>
    <h1>ESTIMATE REPORT</h1>
    <p class="subtitle">Owner review of proposed maintenance work and vendor pricing</p>
    <div class="rule"></div>
    <table class="meta">
      <colgroup><col style="width:16%"><col style="width:38%"><col style="width:16%"><col style="width:30%"></colgroup>
      <tr><th>Task ID</th><td>${esc(reportNumber)}</td><th>Report Date</th><td>${new Date().toLocaleDateString()}</td></tr>
      <tr><th>Property</th><td colspan="3">${esc(task.property_address || "No property address")}</td></tr>
      <tr><th>Maintenance Task</th><td colspan="3">${esc(task.task_name || "Maintenance task")}</td></tr>
      <tr><th>Category</th><td>${esc(task.category || "General Repair")}</td><th>Priority</th><td>${esc(task.priority || "Medium")}</td></tr>
    </table>
    <table class="lines">
      <thead><tr><th>Vendor</th><th>Scope / Description</th><th class="number">Qty</th><th class="number">Unit Cost</th><th class="number">Total</th><th>Status</th></tr></thead>
      <tbody>${estimateRows}</tbody>
    </table>
    <h2 class="section-title">Vendor Estimate Comparison</h2>
    <table class="lines">
      <thead><tr><th>Vendor</th><th class="number">Submitted Quote</th><th>Status</th><th>Submitted Date</th><th>Notes / Exclusions</th></tr></thead>
      <tbody>${comparisonRows}</tbody>
    </table>
    <h2 class="section-title">Quote Attachments</h2>
    <table class="lines">
      <thead><tr><th>Vendor</th><th>Attached Document</th></tr></thead>
      <tbody>${attachmentRows}</tbody>
    </table>
    <div class="notes"><strong>Estimate Notes / Exclusions</strong>${esc(notes || "No additional notes provided.")}</div>
    <div class="footer"><span>Operations Distribution Center · Maintenance Management Hub</span><span>Estimate Report ${esc(reportNumber)}</span></div>
  </main></body></html>`);
  reportWindow.document.close();
}

async function downloadEstimateReportWithAttachments(taskId, targetWindow = null) {
  const task = tasks.find((item) => String(item.id) === String(taskId));
  if (!task || !(task.estimates || []).length) {
    alert("No estimates are available for this report.");
    return;
  }
  if (!window.PDFLib) {
    alert("The PDF report library is still loading. Try again in a moment.");
    return;
  }
  const previewWindow = targetWindow || window.open("", "_blank");
  if (!previewWindow) {
    alert("Allow pop-ups to preview the complete estimate report.");
    return;
  }
  previewWindow.document.write(`<!doctype html><title>Preparing Estimate Report</title>
    <body style="font-family:Arial,sans-serif;padding:40px;color:#123660">
      <h2>Preparing the complete estimate report…</h2>
      <p>The comparison and original attachments are being assembled.</p>
    </body>`);
  previewWindow.document.close();
  setStatus("Generating the complete estimate report and original attachments...");
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0.07, 0.21, 0.38);
  const lightBlue = rgb(0.91, 0.95, 0.99);
  const gray = rgb(0.35, 0.42, 0.52);
  let page = pdf.addPage([792, 612]);
  const margin = 22;
  const reportNumber = String(task.task_id || task.work_order_number || task.id || "N/A");
  const truncate = (value, max = 55) => {
    const text = String(value || "");
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  };
  const drawCell = (x, top, width, height, text, options = {}) => {
    page.drawRectangle({
      x, y: top - height, width, height,
      color: options.fill || rgb(1, 1, 1),
      borderColor: rgb(0.61, 0.68, 0.77),
      borderWidth: 0.6
    });
    page.drawText(truncate(text, options.max || 48), {
      x: x + (options.align === "right" ? width - 8 - (options.font || regular).widthOfTextAtSize(truncate(text, options.max || 48), options.size || 8) : 8),
      y: top - height + (height - (options.size || 8)) / 2,
      size: options.size || 8,
      font: options.font || regular,
      color: options.color || blue
    });
  };
  const allAttachments = [];
  for (const estimate of task.estimates || []) {
    for (const attachment of estimate.attachments || []) {
      allAttachments.push({ ...attachment, vendor: estimate.vendor || task.vendor_name || "Vendor" });
    }
  }
  page.drawText("ESTIMATE REPORT", { x: margin, y: 566, size: 25, font: bold, color: blue });
  page.drawText("Owner review of proposed maintenance work and vendor pricing", { x: margin, y: 544, size: 9, font: regular, color: gray });
  page.drawRectangle({ x: margin, y: 524, width: 748, height: 2, color: rgb(0.15, 0.39, 0.68) });

  let top = 506;
  drawCell(margin, top, 120, 28, "TASK ID", { fill: lightBlue, font: bold, size: 7 });
  drawCell(margin + 120, top, 285, 28, reportNumber, { size: 9 });
  drawCell(margin + 405, top, 120, 28, "REPORT DATE", { fill: lightBlue, font: bold, size: 7 });
  drawCell(margin + 525, top, 223, 28, new Date().toLocaleDateString(), { size: 9 });
  top -= 28;
  drawCell(margin, top, 120, 28, "PROPERTY", { fill: lightBlue, font: bold, size: 7 });
  drawCell(margin + 120, top, 628, 28, task.property_address || "No property address", { size: 9, max: 90 });
  top -= 28;
  drawCell(margin, top, 120, 28, "MAINTENANCE TASK", { fill: lightBlue, font: bold, size: 7 });
  drawCell(margin + 120, top, 628, 28, task.task_name || "Maintenance task", { size: 9, max: 90 });
  top -= 28;
  drawCell(margin, top, 120, 28, "CATEGORY", { fill: lightBlue, font: bold, size: 7 });
  drawCell(margin + 120, top, 285, 28, task.category || "General Repair", { size: 9 });
  drawCell(margin + 405, top, 120, 28, "PRIORITY", { fill: lightBlue, font: bold, size: 7 });
  drawCell(margin + 525, top, 223, 28, task.priority || "Medium", { size: 9 });

  const detailWidths = [108, 235, 68, 125, 103, 109];
  let detailTop = 370;
  ["VENDOR", "SCOPE / DESCRIPTION", "QTY", "UNIT COST", "TOTAL", "STATUS"].forEach((header, index) => {
    const x = margin + detailWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
    drawCell(x, detailTop, detailWidths[index], 24, header, { fill: blue, color: rgb(1, 1, 1), font: bold, size: 7 });
  });
  detailTop -= 24;
  for (const estimate of task.estimates || []) {
    const detail = estimate.details?.[0] || {};
    const values = [
      estimate.vendor || task.vendor_name || "Vendor",
      detail.description || estimate.notes || "Estimate",
      String(detail.qty ?? 1),
      money(detail.unit_cost || estimate.amount || 0),
      money(estimate.amount || 0),
      estimate.status || "Pending"
    ];
    values.forEach((value, index) => {
      const x = margin + detailWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
      drawCell(x, detailTop, detailWidths[index], 26, value, { size: 8, max: index === 1 ? 40 : 22, font: index === 4 ? bold : regular });
    });
    detailTop -= 26;
  }

  page.drawText("Vendor Estimate Comparison", { x: margin, y: 244, size: 11, font: bold, color: blue });
  const compareWidths = [92, 176, 90, 200, 190];
  let compareTop = 232;
  ["VENDOR", "SUBMITTED QUOTE", "STATUS", "SUBMITTED DATE", "NOTES / EXCLUSIONS"].forEach((header, index) => {
    const x = margin + compareWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
    drawCell(x, compareTop, compareWidths[index], 24, header, { fill: blue, color: rgb(1, 1, 1), font: bold, size: 7 });
  });
  compareTop -= 24;
  for (const estimate of task.estimates || []) {
    const values = [
      estimate.vendor || task.vendor_name || "Vendor",
      money(estimate.amount || 0),
      estimate.status || "Pending",
      formatDateTime(estimate.created_at) || "Not recorded",
      estimate.notes || "—"
    ];
    values.forEach((value, index) => {
      const x = margin + compareWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
      drawCell(x, compareTop, compareWidths[index], 26, value, { size: index === 1 ? 10 : 8, font: index === 1 ? bold : regular, max: index === 4 ? 34 : 28 });
    });
    compareTop -= 26;
  }

  page.drawText("Quote Attachments", { x: margin, y: 106, size: 11, font: bold, color: blue });
  drawCell(margin, 94, 142, 23, "VENDOR", { fill: blue, color: rgb(1, 1, 1), font: bold, size: 7 });
  drawCell(margin + 142, 94, 606, 23, "ATTACHED DOCUMENT", { fill: blue, color: rgb(1, 1, 1), font: bold, size: 7 });
  const attachment = allAttachments[0];
  drawCell(margin, 71, 142, 25, attachment?.vendor || "—", { size: 8 });
  drawCell(margin + 142, 71, 606, 25, attachment?.name || "No quote documents attached.", { size: 8, max: 85 });

  for (let attachmentIndex = 0; attachmentIndex < allAttachments.length; attachmentIndex += 1) {
    const attachment = allAttachments[attachmentIndex];
    if (!attachment.path || !client) continue;
    const { data, error } = await client.storage.from(PHOTO_BUCKET).createSignedUrl(attachment.path, 3600);
    if (error || !data?.signedUrl) continue;
    try {
      const response = await fetch(data.signedUrl);
      if (!response.ok) continue;
      const bytes = await response.arrayBuffer();
      const name = String(attachment.name || "").toLowerCase();
      const mimeType = attachment.type || (name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
      await pdf.attach(bytes, attachment.name || `quote-attachment-${attachmentIndex + 1}`, {
        mimeType,
        description: `Original quote submitted by ${attachment.vendor}`,
        creationDate: new Date()
      });
      const cover = pdf.addPage([612, 792]);
      cover.drawText(`ATTACHMENT ${attachmentIndex + 1}`, { x: 42, y: 720, size: 11, font: bold, color: rgb(0.15, 0.39, 0.68) });
      cover.drawText("ORIGINAL VENDOR QUOTE", { x: 42, y: 680, size: 24, font: bold, color: blue });
      cover.drawRectangle({ x: 42, y: 656, width: 528, height: 2, color: rgb(0.15, 0.39, 0.68) });
      cover.drawText("Vendor", { x: 42, y: 620, size: 9, font: bold, color: gray });
      cover.drawText(truncate(attachment.vendor, 70), { x: 140, y: 620, size: 11, font: regular, color: blue });
      cover.drawText("Original File", { x: 42, y: 590, size: 9, font: bold, color: gray });
      cover.drawText(truncate(attachment.name, 70), { x: 140, y: 590, size: 11, font: regular, color: blue });
      cover.drawText("The exact original file is embedded in this PDF.", { x: 42, y: 535, size: 10, font: regular, color: gray });
      cover.drawText("PDF and image files are also displayed on the following page(s).", { x: 42, y: 518, size: 10, font: regular, color: gray });
      if (attachment.type === "application/pdf" || name.endsWith(".pdf")) {
        const attachedPdf = await PDFDocument.load(bytes);
        const copied = await pdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
        copied.forEach((attachedPage) => pdf.addPage(attachedPage));
      } else if (/image\/png/i.test(attachment.type) || name.endsWith(".png")) {
        const image = await pdf.embedPng(bytes);
        const imagePage = pdf.addPage([612, 792]);
        const scale = Math.min(528 / image.width, 700 / image.height, 1);
        imagePage.drawText(`${attachment.vendor} — ${attachment.name}`, { x: 42, y: 760, size: 10, font: bold, color: blue });
        imagePage.drawImage(image, { x: 42, y: 730 - image.height * scale, width: image.width * scale, height: image.height * scale });
      } else if (/image\/jpe?g/i.test(attachment.type) || /\.jpe?g$/.test(name)) {
        const image = await pdf.embedJpg(bytes);
        const imagePage = pdf.addPage([612, 792]);
        const scale = Math.min(528 / image.width, 700 / image.height, 1);
        imagePage.drawText(`${attachment.vendor} — ${attachment.name}`, { x: 42, y: 760, size: 10, font: bold, color: blue });
        imagePage.drawImage(image, { x: 42, y: 730 - image.height * scale, width: image.width * scale, height: image.height * scale });
      }
    } catch (error) {
      console.warn("Unable to embed estimate attachment", attachment.name, error);
    }
  }

  const output = await pdf.save();
  const reportUrl = URL.createObjectURL(new Blob([output], { type: "application/pdf" }));
  previewWindow.location.href = reportUrl;
  setTimeout(() => URL.revokeObjectURL(reportUrl), 10 * 60 * 1000);
  setStatus(`Complete estimate report opened for review. Use the PDF viewer to download task ${reportNumber}.`);
}

window.downloadEstimateReportWithAttachments = downloadEstimateReportWithAttachments;

async function saveEstimateFromModal(e) {
  e.preventDefault();
  const id = els.estimatesForm.elements.id.value;
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const data = Object.fromEntries(new FormData(els.estimatesForm).entries());
  const attachmentFile = els.estimatesForm.elements.attachment.files?.[0];
  let attachments = [];
  if (attachmentFile) {
    if (attachmentFile.size > 10 * 1024 * 1024) {
      setStatus("Attachment is too large. Choose a file smaller than 10 MB.");
      return;
    }
    const cleanName = attachmentFile.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const taskFolder = String(task.task_id || task.work_order_number || task.id || "task").replace(/[^a-zA-Z0-9_-]+/g, "_");
    const path = `estimate-attachments/${taskFolder}/${Date.now()}_${cleanName}`;
    const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, attachmentFile, {
      contentType: attachmentFile.type || "application/octet-stream",
      upsert: false
    });
    if (error) {
      setStatus(`Attachment upload failed: ${error.message}`);
      return;
    }
    attachments = [{
      name: attachmentFile.name,
      path,
      type: attachmentFile.type || "application/octet-stream",
      size: attachmentFile.size
    }];
  }
  const estimate = {
    vendor:data.vendor || "Vendor",
    status:data.status || "Pending",
    amount:Number(data.amount || 0),
    notes:data.notes || "",
    attachments,
    details:[{
      description:data.line_description || "",
      qty:Number(data.line_qty || 0),
      unit_cost:Number(data.line_unit_cost || 0),
      total:Number(data.amount || 0)
    }],
    created_at:new Date().toISOString()
  };
  const saved = await updateTask(id, { estimates:[estimate, ...(task.estimates || [])] });
  if (!saved) {
    if (attachments.length) {
      await client.storage.from(PHOTO_BUCKET).remove(attachments.map((attachment) => attachment.path));
    }
    return;
  }
  const updated = tasks.find((t) => t.id === id);
  if (updated) {
    openTask(updated);
    openEstimatesTask(updated);
  }
}

async function deleteTask(id) {
  if (!confirm("Permanently delete this archived maintenance task? This cannot be undone.")) return;
  const { error } = await client.from(TABLE).delete().eq("id", id);
  if (error) return setStatus(`Delete failed: ${error.message}`);
  tasks = tasks.filter((t) => t.id !== id);
  render();
  setStatus("Archived maintenance task deleted.");
}

async function updateTask(id, patch) {
  const { data, error } = await client.from(TABLE).update(patch).eq("id", id).select().single();
  if (error) {
    setStatus(`Update failed: ${error.message}`);
    return false;
  }
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx >= 0) tasks[idx] = normalizeDbTask(data);
  render();
  return true;
}

async function openEstimateAttachment(task, estimateIndex, attachmentIndex) {
  const attachment = task.estimates?.[estimateIndex]?.attachments?.[attachmentIndex];
  if (!attachment?.path || !client) return;
  const { data, error } = await client.storage.from(PHOTO_BUCKET).createSignedUrl(attachment.path, 3600);
  if (error || !data?.signedUrl) {
    setStatus(`Unable to open attachment: ${error?.message || "File link unavailable."}`);
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

function openSettings() { openModal("settingsModal"); }
function openModal(id) { els.modalBackdrop.hidden = false; $(id).hidden = false; }
function handleCloseClick(e) {
  const modal = e.currentTarget.closest(".modal");
  if (modal) {
    modal.hidden = true;
    syncBackdrop();
    return;
  }
  closeModal();
}

function closeModal() { els.modalBackdrop.hidden = true; document.querySelectorAll(".modal").forEach((m) => m.hidden = true); }
function syncBackdrop() {
  els.modalBackdrop.hidden = !document.querySelector(".modal:not([hidden])");
}
function switchView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach((v) => v.hidden = true);
  $(`${view}View`).hidden = false;
  document.querySelectorAll(".nav").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
}
function setStatus(message) { els.statusLine.textContent = message; }
function setImport(message) { els.importResult.textContent = message; setStatus(message); }

function buildPropertyAddress(property, unit) {
  const cleanProperty = String(property || "").trim() || "No property address";
  const cleanUnit = String(unit || "").trim();
  if (!cleanUnit) return cleanProperty;
  if (/^unit\b/i.test(cleanUnit)) return `${cleanProperty} - ${cleanUnit}`;
  return `${cleanProperty} - Unit ${cleanUnit}`;
}

function summarizeVendors(rows) {
  const groups = groupBy(rows, (row) => row.vendor_name || "Unassigned Work");
  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([vendor, items]) => `${vendor}: ${items.length}`)
    .join(" | ") || "none";
}

function buildVendorMapFromRows(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const vendor = normalizeVendor(pickVendor(row));
    const taskId = pick(row, ["taskid", "task", "id", "maintenanceid", "workorderid"]);
    const workOrderId = pick(row, ["workordernumber", "workorderid", "wo", "number"]);
    [taskId, workOrderId].filter(Boolean).forEach((key) => {
      const cleanKey = String(key).trim();
      const existing = map.get(cleanKey);
      if (!existing || existing === "Unassigned Work" || vendor !== "Unassigned Work") map.set(cleanKey, vendor);
    });
  });
  return map;
}

function buildiumRowToTask(row) {
  if (!isMaintenanceRow(row)) return null;
  const taskId = pick(row, ["taskid", "task", "id", "maintenanceid", "workorderid"]);
  const title = pick(row, ["shortdescription", "subject", "title", "taskname", "summary", "request", "description"]) || "Untitled Maintenance Task";
  const property = pick(row, ["property", "propertyname", "propertyaddress", "address", "rental", "building"]) || "No property address";
  const unit = pick(row, ["unit", "unitnumber"]);
  const address = property && unit && !property.includes(unit) ? `${property} - Unit ${unit}` : property;
  return {
    source:"Buildium",
    task_id:taskId || null,
    task_name:title,
    vendor_name:normalizeVendor(pickVendor(row)),
    work_order_number:pick(row, ["workordernumber", "workorderid", "wo", "number"]) || taskId || null,
    work_order_url:taskId ? `https://savannaimpalallc.managebuilding.com/manager/app/tasks/${taskId}/task-summary` : null,
    property_name:propertyRoot(address),
    unit_number:unitPart(address),
    property_address:address,
    category:normalizeCategory(pick(row, ["category", "type"])),
    priority:normalizePriority(pick(row, ["priority", "urgency"])),
    due_date:normalizeDate(pick(row, ["duedate", "due", "scheduleddate", "targetdate"])),
    status:normalizeStatus(pick(row, ["status", "state", "workorderstatus"])),
    notes:buildNotes(row),
    updates:buildUpdate(row),
    estimates:[],
    photos:[],
    linked_task_ids:[],
    archived:false
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && quoted && n === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && n === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  row.push(cell); rows.push(row);
  const headers = rows.shift().map(normalizeHeader);
  return rows.filter((r) => r.some((v) => String(v).trim())).map((r) => Object.fromEntries(headers.map((h,i) => [h, r[i] || ""])));
}

function isMaintenanceRow(row) {
  const category = pick(row, ["category", "maintenancecategory"]).toLowerCase();
  const taskType = pick(row, ["tasktype", "type"]).toLowerCase();
  const searchable = [
    category,
    taskType,
    pick(row, ["shortdescription", "subject", "title", "description"]),
    pick(row, ["latestcomments", "comments", "details", "notes", "problem", "requestdetails"])
  ].join(" ").toLowerCase();
  const excludedCategory = [
    "accounting", "administration", "management", "legal", "enforcement",
    "general inquiry", "inquiry", "question", "suggestion", "feedback", "leasing"
  ].some((word) => category.includes(word));
  const excludedText = ["eviction", "commission", "legal preparation"].some((word) => searchable.includes(word));
  if (excludedCategory || excludedText) return false;
  if (category.includes("maintenance")) return true;
  if (taskType.includes("resident request")) return true;
  const maintenanceWords = [
    "maintenance", "repair", "restore", "restoration", "service call", "inspection", "inspector",
    "clean", "cleaning", "mow", "lawn", "yard", "trash", "pest", "rodent", "ants", "bait",
    "plumbing", "sink", "toilet", "shower", "bathroom", "leak", "roof", "ceiling",
    "electrical", "lights", "circuit", "hvac", "heat", "air", "paint", "drywall",
    "secure unit", "rent ready", "violation", "city violation"
  ];
  return maintenanceWords.some((word) => searchable.includes(word));
}
function pick(row, names) { for (const n of names) if (row[normalizeHeader(n)]) return String(row[normalizeHeader(n)]).trim(); return ""; }
function pickVendor(row) {
  const exact = pick(row, [
    "vendor", "vendors", "vendorname", "vendorcompany", "vendorcompanies",
    "contractor", "contractorname", "maintenancevendor", "serviceprovider",
    "serviceprovidername", "assignedvendor", "assignedvendorname", "company"
  ]);
  if (exact) return exact;
  const vendorKey = Object.keys(row).find((key) => key.includes("vendor") && !key.includes("assigned"));
  return vendorKey ? String(row[vendorKey] || "").trim() : "";
}
function normalizeHeader(v) { return String(v || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function normalizeVendor(v) {
  const text = String(v || "").trim();
  if (!text || /^\*?tba$/i.test(text) || /assigned to|waiting list|unassigned/i.test(text)) return "Unassigned Work";
  return text;
}
function normalizePriority(v) { return /high/i.test(v) ? "High" : /low/i.test(v) ? "Low" : "Medium"; }
function normalizeCategory(v) {
  const text = String(v || "").trim();
  if (!text || /maintenance request|uncategorized/i.test(text)) return "General Repair";
  return text;
}
function normalizeStatus(v) {
  const s = String(v || "Open").toLowerCase();
  if (s.includes("complete") || s.includes("closed")) return "Completed";
  if (s.includes("progress")) return "In Progress";
  if (s.includes("estimate approval")) return "Waiting for Estimate Approval";
  if (s.includes("estimate")) return "Waiting for Estimate";
  if (s.includes("vendor")) return "Waiting on Vendor";
  return "Open";
}
function normalizeDate(v) { const d = new Date(v); return v && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0,10) : null; }
function buildNotes(row) { return pick(row, ["description", "notes", "details", "message"]) || ""; }
function buildUpdate(row) { const msg = buildNotes(row); return msg ? [{ message:msg, created_at:new Date().toISOString() }] : []; }
function normalizeDbTask(t) { return { ...t, updates:t.updates || [], estimates:t.estimates || [], photos:t.photos || [], linked_task_ids:t.linked_task_ids || [] }; }
function buildPreserveMap(rows) {
  const map = new Map();
  rows.forEach((task) => taskKeys(task).forEach((key) => {
    if (!map.has(key)) map.set(key, task);
  }));
  return map;
}
function findPreservedTask(map, task) {
  return taskKeys(task).map((key) => map.get(key)).find(Boolean);
}
function taskKeys(t) {
  const workOrder = String(t.work_order_number || "").trim();
  const taskId = String(t.task_id || "").trim();
  return [...new Set([
    workOrder ? `wo:${workOrder}` : "",
    taskId && !workOrder ? `task:${taskId}` : "",
    t.id ? `id:${t.id}` : ""
  ].filter(Boolean))];
}
function buildBuildiumTaskUrl(taskId) {
  const id = String(taskId || "").trim().match(/\d+/)?.[0] || "";
  return id ? `https://savannaimpalallc.managebuilding.com/manager/app/tasks/${id}/task-summary` : "";
}
function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function startOfDay(date) { const next = new Date(date); next.setHours(0,0,0,0); return next; }
function groupBy(rows, fn) { const m = new Map(); rows.forEach((r) => { const k = fn(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); return m; }
function latestActivity(rows) {
  return rows.map((t) => t.updated_at || t.created_at).filter(Boolean).sort().at(-1) || "";
}
function propertyRoot(v) { return String(v || "No property address").replace(/\s+-\s+Unit\s+.+$/i, "").trim(); }
function unitPart(v) { const m = String(v || "").match(/\s+-\s+Unit\s+(.+)$/i); return m ? m[1].trim() : ""; }
function dueClass(t) { if (!t.due_date) return ""; const days = (new Date(t.due_date) - new Date()) / 86400000; return days < 0 ? "priority-high" : days <= 7 ? "priority-medium" : ""; }
function safeClass(v) { return String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function esc(v) { return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function normalizeSupabaseUrl(value) {
  const text = String(value || "").trim();
  const match = text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
  return (match ? match[0] : text).replace(/\/+$/, "");
}
function isSupabaseProjectUrl(value) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(value || "").trim());
}
function formatDate(v) { return v ? new Date(`${v}T00:00:00`).toLocaleDateString() : ""; }
function formatDateTime(v) { return v ? new Date(v).toLocaleString() : ""; }
function money(v) { return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(Number(v || 0)); }
function exportCsv() {
  const header = ["Task ID","Task","Property","Vendor","Category","Priority","Due","Status","Notes"];
  const rows = filteredTasks().map((t) => [t.task_id || "", t.task_name, t.property_address || "", t.vendor_name || "", t.category || "", t.priority || "", t.due_date || "", t.status || "", t.notes || ""]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"','""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
  a.download = "maintenance-management-hub.csv";
  a.click();
}
