(function () {
  const config = window.APP_RUNTIME_CONFIG || {};
  const headers = { apikey: config.supabaseAnonKey || "", Authorization: `Bearer ${config.supabaseAnonKey || ""}` };
  let records = [];
  const $ = (id) => document.getElementById(id);
  const completed = (value) => /complete|closed|done/i.test(value || "");
  const active = (value) => !completed(value) && !/archive|deferred/i.test(value || "");
  const attention = (record) => active(record.status) && (/high|urgent/i.test(record.priority) || /waiting/i.test(record.status) || (record.dueDate && new Date(`${record.dueDate}T23:59:59`) < new Date()));
  const thisMonth = (record) => {
    if (!completed(record.status) || !record.updatedAt) return false;
    const date = new Date(record.updatedAt), now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };
  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }
  function render(list) {
    $("resultCount").textContent = `${list.length} record${list.length === 1 ? "" : "s"}`;
    $("activityList").innerHTML = list.slice(0, 12).map((record) => `
      <a class="activity-row" href="${record.href}">
        <span class="activity-mark ${record.kind}">${record.kind === "tasks" ? "✓" : "⌂"}</span>
        <span><small>${escapeHtml(record.app)}</small><strong>${escapeHtml(record.title)}</strong><em>${escapeHtml(record.meta || record.status)}</em></span>
        <b>${escapeHtml(record.status)}</b>
      </a>`).join("") || '<p class="loading">No matching records.</p>';
  }
  async function load() {
    try {
      const [adminResponse, maintenanceResponse] = await Promise.all([
        fetch(`${config.supabaseUrl}/rest/v1/task_management_state?select=state,updated_at&id=eq.1`, { headers, cache: "no-store" }),
        fetch(`${config.supabaseUrl}/rest/v1/maintenance_tasks?select=id,task_name,property_address,vendor_name,status,priority,due_date,updated_at,archived&order=updated_at.desc`, { headers, cache: "no-store" })
      ]);
      if (!adminResponse.ok || !maintenanceResponse.ok) throw new Error("Unable to load shared data");
      const adminRows = await adminResponse.json();
      const maintenanceRows = await maintenanceResponse.json();
      const admin = ((adminRows[0] && adminRows[0].state && adminRows[0].state.tasks) || []).filter((item) => !item.archived);
      const maintenance = maintenanceRows.filter((item) => !item.archived);
      records = admin.map((item) => ({
        app: "Tasks", kind: "tasks", title: item.taskName || item.description || "Administrative task",
        meta: [item.project, item.assignee].filter(Boolean).join(" · "), status: item.status || "New",
        priority: item.priority || "Medium", dueDate: item.dueDate || "", updatedAt: item.lastUpdatedAt || "",
        href: `task-management/index.html?record=${encodeURIComponent(item.id || "")}`
      })).concat(maintenance.map((item) => ({
        app: "Maintenance", kind: "maintenance", title: item.task_name || "Maintenance task",
        meta: [item.property_address, item.vendor_name].filter(Boolean).join(" · "), status: item.status || "Open",
        priority: item.priority || "Medium", dueDate: item.due_date || "", updatedAt: item.updated_at || "",
        href: `maintenance-vendors/index.html?record=${encodeURIComponent(item.id || "")}`
      })));
      records.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      $("totalCount").textContent = records.length;
      $("activeCount").textContent = records.filter((item) => active(item.status)).length;
      $("attentionCount").textContent = records.filter(attention).length;
      $("completedCount").textContent = records.filter(thisMonth).length;
      $("adminCount").childNodes[0].nodeValue = `${admin.length} `;
      $("maintenanceCount").childNodes[0].nodeValue = `${maintenance.length} `;
      render(records);
    } catch (error) {
      $("activityList").innerHTML = '<p class="loading">The shared database is temporarily unavailable.</p>';
    }
  }
  $("search").addEventListener("input", function () {
    const query = this.value.trim().toLowerCase();
    render(!query ? records : records.filter((record) => `${record.app} ${record.title} ${record.meta} ${record.status} ${record.priority}`.toLowerCase().includes(query)));
  });
  $("logout").addEventListener("click", function () {
    sessionStorage.removeItem("odc_employee_access");
    location.href = "login.html";
  });
  load();
})();
