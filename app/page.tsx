"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const activity = [
  { app: "Maintenance", tone: "maintenance", title: "Ceiling leak estimate approved", meta: "Task 758657 · Jason Field · 12 minutes ago" },
  { app: "Tasks", tone: "tasks", title: "Building Owner Registry moved to In Progress", meta: "25–27 Harris Street · 38 minutes ago" },
  { app: "Maintenance", tone: "maintenance", title: "Rodent treatment follow-up added", meta: "135 Glendale Park · 1 hour ago" },
  { app: "Tasks", tone: "tasks", title: "Monthly commission due date updated", meta: "21402 Lakefront Drive · 2 hours ago" },
];

const launchers = [
  {
    id: "tasks",
    eyebrow: "ADMINISTRATIVE WORK",
    title: "Task Management",
    description: "Plan assignments, review priorities, manage projects, and track administrative work.",
    stat: "37",
    statLabel: "active records",
    accent: "blue",
    href: "/task-management/index.html",
    features: ["Dashboard", "Table", "Kanban", "Archive"],
  },
  {
    id: "maintenance",
    eyebrow: "PROPERTY OPERATIONS",
    title: "Maintenance & Vendors",
    description: "Monitor work orders, vendors, properties, estimates, and maintenance progress.",
    stat: "27",
    statLabel: "work orders",
    accent: "amber",
    href: "/maintenance-vendors/index.html",
    features: ["Vendors", "Properties", "Calendar", "Estimates"],
  },
  {
    id: "work-orders",
    eyebrow: "FIELD DOCUMENTS",
    title: "Field Operations Document Generator",
    description: "Create work order authorizations, verifications, approval records, and field-ready reports.",
    stat: "4",
    statLabel: "document tools",
    accent: "green",
    href: "/work-order-generator/index.html",
    features: ["Authorization", "Verification", "Saved Work", "PDF Reports"],
  },
];

const metrics = [
  { id: "total", icon: "▤", tone: "indigo", value: "64", label: "Total records", note: "Across both apps" },
  { id: "active", icon: "↗", tone: "cyan", value: "48", label: "Open & active", note: "+4 this week" },
  { id: "attention", icon: "!", tone: "rose", value: "11", label: "Need attention", note: "Overdue or high priority" },
  { id: "completed", icon: "✓", tone: "green", value: "16", label: "Completed", note: "This month" },
];

type DashboardData = {
  counts: {
    total: number; active: number; attention: number; completed: number;
    admin: number; maintenance: number;
  };
  recent: {
    id: string; app: string; title: string; meta: string; status: string;
    priority: string; dueDate: string; updatedAt: string; appId: number;
  }[];
  details: Record<string, {
    id: string; app: string; title: string; meta: string; status: string;
    priority: string; dueDate: string; updatedAt: string; appId: number;
  }[]>;
};

const metricDetails: Record<string, {
  title: string;
  subtitle: string;
  summary: { value: string; label: string }[];
  records: { id?: string; app: string; title: string; meta: string; badge: string; appId: number }[];
}> = {
  total: {
    title: "All records",
    subtitle: "Combined records from both applications",
    summary: [{ value: "37", label: "Task Management" }, { value: "27", label: "Maintenance" }],
    records: [
      { app: "Tasks", title: "Building Owner Registry Compliance", meta: "25–27 Harris Street · High priority", badge: "In Progress", appId: 0 },
      { app: "Maintenance", title: "Ceiling leak — estimate approved", meta: "Work order 758657 · Jason Field", badge: "In Progress", appId: 1 },
      { app: "Tasks", title: "Monthly commission review", meta: "21402 Lakefront Drive · Medium priority", badge: "New", appId: 0 },
      { app: "Maintenance", title: "Rodent treatment follow-up", meta: "135 Glendale Park · ABC Pest Control", badge: "Open", appId: 1 },
    ],
  },
  active: {
    title: "Open & active",
    subtitle: "Work currently moving through either application",
    summary: [{ value: "29", label: "Administrative" }, { value: "19", label: "Maintenance" }],
    records: [
      { app: "Tasks", title: "Anthony Webb Eviction", meta: "33 Kenwood Avenue · Due today", badge: "In Progress", appId: 0 },
      { app: "Maintenance", title: "Hallway cleanout", meta: "Work order 851465 · Unassigned", badge: "In Progress", appId: 1 },
      { app: "Tasks", title: "Set up property management meeting", meta: "Administration · Due Friday", badge: "New", appId: 0 },
    ],
  },
  attention: {
    title: "Needs attention",
    subtitle: "Overdue, high-priority, or waiting work",
    summary: [{ value: "5", label: "Overdue" }, { value: "3", label: "High priority" }, { value: "3", label: "Waiting" }],
    records: [
      { app: "Tasks", title: "Clear violations", meta: "15 Morgan Street · Overdue", badge: "High", appId: 0 },
      { app: "Maintenance", title: "Collapsed ceiling and wet kitchen", meta: "Waiting on vendor response", badge: "Waiting", appId: 1 },
      { app: "Maintenance", title: "Front concrete stairs violation", meta: "25–27 Harris Street · Due soon", badge: "High", appId: 1 },
    ],
  },
  completed: {
    title: "Completed this month",
    subtitle: "Recently finished administrative and maintenance work",
    summary: [{ value: "9", label: "Administrative" }, { value: "7", label: "Maintenance" }],
    records: [
      { app: "Tasks", title: "July invoice review", meta: "Completed July 28", badge: "Completed", appId: 0 },
      { app: "Maintenance", title: "Main door lock replacement", meta: "15 Morgan Street · Completed July 26", badge: "Completed", appId: 1 },
      { app: "Maintenance", title: "Bathroom plumbing repair", meta: "Completed July 24", badge: "Completed", appId: 1 },
    ],
  },
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isTechAdmin, setIsTechAdmin] = useState(false);
  const [utilityPanel, setUtilityPanel] = useState<"notifications" | "help" | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const recentSection = useRef<HTMLElement>(null);
  const filteredActivity = useMemo(() => {
    const term = query.trim().toLowerCase();
    const source = dashboard?.recent.map((item) => ({
      app: item.app,
      tone: item.app === "Tasks" ? "tasks" : "maintenance",
      title: item.title,
      meta: `${item.meta}${item.meta ? " · " : ""}${item.status}`,
    })) || activity;
    if (!term) return source;
    return source.filter((item) =>
      `${item.app} ${item.title} ${item.meta}`.toLowerCase().includes(term),
    );
  }, [query, dashboard]);
  const selectedMetric = useMemo(() => {
    if (!activeMetric) return null;
    const fallback = metricDetails[activeMetric];
    if (!dashboard) return fallback;
    const liveRecords = dashboard.details[activeMetric] || [];
    const summary = activeMetric === "total"
      ? [
          { value: String(dashboard.counts.admin), label: "Task Management" },
          { value: String(dashboard.counts.maintenance), label: "Maintenance" },
        ]
      : [{ value: String(dashboard.counts[activeMetric as keyof DashboardData["counts"]]), label: fallback.title }];
    return {
      ...fallback,
      summary,
      records: liveRecords.map((record) => ({
        id: record.id,
        app: record.app,
        title: record.title,
        meta: record.meta || record.dueDate || "No additional details",
        badge: record.status,
        appId: record.appId,
      })),
    };
  }, [activeMetric, dashboard]);
  const liveMetrics = metrics.map((metric) => ({
    ...metric,
    value: dashboard ? String(dashboard.counts[metric.id as keyof DashboardData["counts"]]) : metric.value,
  }));
  const liveLaunchers = launchers.map((app) => ({
    ...app,
    stat: dashboard
      ? String(app.id === "tasks" ? dashboard.counts.admin : app.id === "maintenance" ? dashboard.counts.maintenance : app.stat)
      : app.stat,
  }));
  const searchResults = useMemo(() => {
    const records = dashboard?.details.total || [];
    const term = query.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) =>
      `${record.app} ${record.title} ${record.meta} ${record.status} ${record.priority}`.toLowerCase().includes(term),
    );
  }, [dashboard, query]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveMetric(null);
        setSearchOpen(false);
        setUtilityPanel(null);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/tech-admin/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (mounted) setIsTechAdmin(Boolean(data.authenticated)); })
      .catch(() => { if (mounted) setIsTechAdmin(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to refresh dashboard.");
        if (mounted) setDashboard(data);
      } catch {
        if (mounted) setNotice("Live dashboard data is temporarily unavailable.");
      }
    }
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  function openApp(href: string, title: string, recordId?: string) {
    setNotice(`Opening ${title} in its original interface…`);
    const destination = new URL(href, window.location.origin);
    if (recordId) destination.searchParams.set("record", recordId);
    window.open(destination.toString(), "_blank", "noopener,noreferrer");
    window.setTimeout(() => setNotice(""), 2200);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-label="Operations Distribution Center"><i /><i /><i /><i /></div>
          <div><strong>Operations Distribution Center</strong><span>Property workspace</span></div>
        </div>
        <nav aria-label="Primary navigation">
          <button className="nav-item active" type="button" onClick={() => { setSearchOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span>⌂</span>Home</button>
          <button className="nav-item" type="button" onClick={() => { setSearchOpen(true); window.setTimeout(() => searchInput.current?.focus(), 50); }}><span>⌕</span>Shared search</button>
          <button className="nav-item" type="button" onClick={() => { setSearchOpen(false); recentSection.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span>◷</span>Recent activity</button>
        </nav>
        {isTechAdmin && <div className="sidebar-section admin-tools">
          <span className="section-label">TECH ADMIN TOOLS</span>
          <button className="app-shortcut" type="button" onClick={() => { window.location.href = "/data-control"; }}>
            <span className="shortcut-dot admin" />Data Control
          </button>
        </div>}
        <div className="sidebar-section">
          <span className="section-label">APPLICATIONS</span>
          <button className="app-shortcut" type="button" onClick={() => openApp(launchers[0].href, launchers[0].title)}>
            <span className="shortcut-dot blue" />Task Management
          </button>
          <button className="app-shortcut" type="button" onClick={() => openApp(launchers[1].href, launchers[1].title)}>
            <span className="shortcut-dot amber" />Maintenance
          </button>
          <button className="app-shortcut" type="button" onClick={() => openApp(launchers[2].href, launchers[2].title)}>
            <span className="shortcut-dot green" />Field Documents
          </button>
        </div>
        <div className="sidebar-foot">
          <div className="sync-row"><span className="sync-dot" />Shared database ready</div>
          <button className="user-chip" type="button" onClick={() => { window.location.href = isTechAdmin ? "/tech-admin" : "/login"; }}>
            <span className="avatar">{isTechAdmin ? "TA" : "U"}</span>
            <span><strong>{isTechAdmin ? "Tech Admin" : "Employee Workspace"}</strong><small>{isTechAdmin ? "Administrative access" : "Company access"}</small></span>
            <span className="chevron">›</span>
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark compact" aria-hidden="true"><i /><i /><i /><i /></span><strong>Operations Distribution Center</strong></div>
          <label className="search">
            <span>⌕</span>
            <input ref={searchInput} value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, work orders, vendors, or properties…" aria-label="Search all applications" />
            <kbd>Ctrl K</kbd>
          </label>
          <div className="top-actions">
            <button className="icon-button" type="button" aria-label="Notifications" onClick={() => setUtilityPanel("notifications")}>♢<span className="notification-dot" /></button>
            <button className="help-button" type="button" onClick={() => setUtilityPanel("help")}>Help</button>
          </div>
        </header>

        <div className="content">
          <section className="welcome">
            <div>
              <p className="date-label">UNIFIED PROPERTY OPERATIONS</p>
              <h1>Welcome to the Operations Distribution Center.</h1>
              <p>A clear view of administrative and maintenance work.</p>
            </div>
            <div className="system-pill"><span className="sync-dot" />All systems connected</div>
          </section>

          <section className="stats-grid" aria-label="Combined workload summary">
            {liveMetrics.map((metric) => (
              <button
                className="stat-card"
                type="button"
                key={metric.id}
                onClick={() => setActiveMetric(metric.id)}
                aria-label={`Open ${metric.label} details`}
              >
                <span className={`stat-icon ${metric.tone}`}>{metric.icon}</span>
                <div><strong>{metric.value}</strong><span>{metric.label}</span></div>
                <small className={metric.id === "active" ? "positive" : ""}>{metric.note}</small>
                <span className="stat-open">View details →</span>
              </button>
            ))}
          </section>

          <section className="app-section">
            <div className="section-heading">
              <div><h2>Your applications</h2><p>Open either workspace with its existing screens and tools.</p></div>
              <span>One login · One database</span>
            </div>
            <div className="launcher-grid">
              {liveLaunchers.map((app) => (
                <article className={`launcher ${app.accent}`} key={app.id}>
                  <div className="launcher-top">
                    <span className="app-symbol">
                      {app.id === "tasks" ? "✓" : app.id === "maintenance" ? "⌂" : "▤"}
                    </span>
                    <div className="launcher-stat"><strong>{app.stat}</strong><span>{app.statLabel}</span></div>
                  </div>
                  <p className="launcher-eyebrow">{app.eyebrow}</p>
                  <h3>{app.title}</h3>
                  <p className="launcher-description">{app.description}</p>
                  <div className="feature-row">{app.features.map((feature) => <span key={feature}>{feature}</span>)}</div>
                  <button type="button" onClick={() => openApp(app.href, app.title)}>Open {app.title}<span>→</span></button>
                </article>
              ))}
            </div>
          </section>

          <section className="lower-grid">
            <article className="activity-panel" ref={recentSection}>
              <div className="panel-heading"><div><h2>Recent activity</h2><p>Latest updates across both applications</p></div><button type="button" onClick={() => { setQuery(""); setSearchOpen(true); }}>View all</button></div>
              <div className="activity-list">
                {filteredActivity.length ? filteredActivity.map((item) => (
                  <div className="activity-item" key={item.title}>
                    <span className={`activity-mark ${item.tone}`}>{item.tone === "tasks" ? "✓" : "⌂"}</span>
                    <div><span className={`app-tag ${item.tone}`}>{item.app}</span><strong>{item.title}</strong><small>{item.meta}</small></div>
                    <span className="item-arrow">›</span>
                  </div>
                )) : <div className="empty-state">No recent activity matches “{query}”.</div>}
              </div>
            </article>
            <aside className="attention-panel">
              <div className="panel-heading"><div><h2>Needs attention</h2><p>Combined priority queue</p></div><span className="count-badge">11</span></div>
              <div className="attention-item"><span className="priority high">HIGH</span><strong>5 administrative tasks overdue</strong><small>Task Management</small></div>
              <div className="attention-item"><span className="priority waiting">WAITING</span><strong>3 work orders waiting on vendors</strong><small>Maintenance & Vendors</small></div>
              <div className="attention-item"><span className="priority due">DUE SOON</span><strong>3 maintenance items due this week</strong><small>Maintenance & Vendors</small></div>
            </aside>
          </section>
        </div>
      </section>
      {notice && <div className="toast">{notice}</div>}
      {utilityPanel && (
        <div className="utility-overlay" role="presentation" onMouseDown={() => setUtilityPanel(null)}>
          <aside className="utility-drawer" role="dialog" aria-modal="true" aria-labelledby="utility-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p>OPERATIONS DISTRIBUTION CENTER</p>
                <h2 id="utility-title">{utilityPanel === "notifications" ? "Notifications" : "Workspace help"}</h2>
                <span>{utilityPanel === "notifications" ? "Items that may need employee attention." : "Choose the right workspace for the job."}</span>
              </div>
              <button type="button" onClick={() => setUtilityPanel(null)} aria-label="Close panel">×</button>
            </header>
            {utilityPanel === "notifications" ? (
              <div className="utility-list">
                {(dashboard?.details.attention || []).slice(0, 15).map((record) => (
                  <article key={`${record.app}-${record.id}`}>
                    <span className={`record-app ${record.app === "Tasks" ? "tasks" : "maintenance"}`}>{record.app === "Tasks" ? "✓" : "⌂"}</span>
                    <div><small>{record.app}</small><strong>{record.title}</strong><span>{record.meta || record.priority}</span></div>
                    <button type="button" onClick={() => openApp(launchers[record.appId].href, launchers[record.appId].title, record.id)}>Open</button>
                  </article>
                ))}
                {!dashboard?.details.attention?.length && <div className="empty-state">No records currently need attention.</div>}
              </div>
            ) : (
              <div className="help-content">
                <article><span className="shortcut-dot blue" /><div><strong>Task Management</strong><p>Administrative assignments, compliance, meetings, accounting, legal work, and internal projects.</p></div></article>
                <article><span className="shortcut-dot amber" /><div><strong>Maintenance & Vendors</strong><p>Property repairs, work orders, vendors, estimates, due dates, and completed maintenance.</p></div></article>
                <article><span className="shortcut-dot green" /><div><strong>Field Operations Documents</strong><p>Work authorizations, quote requests, work verification reports, PDFs, and saved field documents.</p></div></article>
                <article><span className="shortcut-dot admin" /><div><strong>Shared Search</strong><p>Find a task in either application and open its exact record directly.</p></div></article>
                {isTechAdmin && <button type="button" className="help-admin-button" onClick={() => { window.location.href = "/data-control"; }}>Open Tech Admin Data Control</button>}
              </div>
            )}
          </aside>
        </div>
      )}
      {searchOpen && (
        <div className="shared-search-overlay" role="presentation" onMouseDown={() => setSearchOpen(false)}>
          <section className="shared-search-panel" role="dialog" aria-modal="true" aria-labelledby="shared-search-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><p>OPERATIONS DISTRIBUTION CENTER</p><h2 id="shared-search-title">Shared search</h2><span>Search across Task Management and Maintenance.</span></div>
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close shared search">×</button>
            </header>
            <label>
              <span>⌕</span>
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Task, work order, vendor, property, status…" />
            </label>
            <div className="shared-search-summary"><strong>{searchResults.length}</strong><span>matching record{searchResults.length === 1 ? "" : "s"}</span></div>
            <div className="shared-search-results">
              {searchResults.map((record) => (
                <article key={`${record.app}-${record.id}`}>
                  <span className={`record-app ${record.app === "Tasks" ? "tasks" : "maintenance"}`}>{record.app === "Tasks" ? "✓" : "⌂"}</span>
                  <div><small>{record.app}</small><strong>{record.title}</strong><span>{record.meta || "No additional details"}</span></div>
                  <div><span className="search-status">{record.status}</span><button type="button" onClick={() => openApp(launchers[record.appId].href, launchers[record.appId].title, record.id)}>Open</button></div>
                </article>
              ))}
              {!searchResults.length && <div className="empty-state">No shared records match “{query}”.</div>}
            </div>
          </section>
        </div>
      )}
      {selectedMetric && (
        <div className="metric-overlay" role="presentation" onMouseDown={() => setActiveMetric(null)}>
          <aside
            className="metric-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="metric-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="metric-header">
              <div>
                <p>COMBINED WORKSPACE</p>
                <h2 id="metric-title">{selectedMetric.title}</h2>
                <span>{selectedMetric.subtitle}</span>
              </div>
              <button type="button" onClick={() => setActiveMetric(null)} aria-label="Close details">×</button>
            </header>
            <div className="metric-summary">
              {selectedMetric.summary.map((item) => (
                <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>
              ))}
            </div>
            <div className="metric-list-heading">
              <strong>Recent records</strong>
              <span>{selectedMetric.records.length} shown</span>
            </div>
            <div className="metric-records">
              {selectedMetric.records.map((record) => (
                <article key={record.title}>
                  <span className={`record-app ${record.app === "Tasks" ? "tasks" : "maintenance"}`}>
                    {record.app === "Tasks" ? "✓" : "⌂"}
                  </span>
                  <div>
                    <span className="record-source">{record.app}</span>
                    <strong>{record.title}</strong>
                    <small>{record.meta}</small>
                  </div>
                  <div className="record-actions">
                    <span>{record.badge}</span>
                    <button type="button" onClick={() => openApp(launchers[record.appId].href, launchers[record.appId].title, record.id)}>
                      Open
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <footer className="metric-footer">
              <span>Showing a preview of the combined data.</span>
              <button type="button" onClick={() => setActiveMetric(null)}>Done</button>
            </footer>
          </aside>
        </div>
      )}
    </main>
  );
}
