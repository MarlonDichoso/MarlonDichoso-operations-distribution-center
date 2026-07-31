(function () {
  const ACCESS_KEY = "odc_employee_access";
  if (sessionStorage.getItem(ACCESS_KEY) === "active") return;
  document.documentElement.style.visibility = "hidden";
  const parts = location.pathname.split("/").filter(Boolean);
  const base = location.hostname.endsWith("github.io") && parts.length ? `/${parts[0]}/` : "/";
  const next = location.pathname + location.search + location.hash;
  location.replace(`${base}login.html?next=${encodeURIComponent(next)}`);
})();
