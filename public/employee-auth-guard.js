(function () {
  document.documentElement.style.visibility = "hidden";

  fetch("/api/employee/status", {
    credentials: "same-origin",
    cache: "no-store",
  })
    .then(function (response) {
      if (!response.ok) throw new Error("Unable to verify access.");
      return response.json();
    })
    .then(function (result) {
      if (result.authenticated) {
        document.documentElement.style.visibility = "";
        return;
      }
      var returnTo =
        window.location.pathname + window.location.search + window.location.hash;
      window.location.replace("/login?next=" + encodeURIComponent(returnTo));
    })
    .catch(function () {
      var returnTo =
        window.location.pathname + window.location.search + window.location.hash;
      window.location.replace("/login?next=" + encodeURIComponent(returnTo));
    });
})();
