(function () {
  const ACCESS_HASH = "7bc455074343ee1b26d4d7f452b8b21f00e7597bec779520860ed0443d15dc0b";
  const ACCESS_KEY = "odc_employee_access";
  const form = document.getElementById("employeeLogin");
  const input = document.getElementById("password");
  const message = document.getElementById("message");
  const show = document.getElementById("showPassword");

  function siteBase() {
    const parts = location.pathname.split("/").filter(Boolean);
    return location.hostname.endsWith("github.io") && parts.length ? `/${parts[0]}/` : "/";
  }
  async function digest(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  if (sessionStorage.getItem(ACCESS_KEY) === "active") location.replace(siteBase());
  show.addEventListener("click", function () {
    input.type = input.type === "password" ? "text" : "password";
    show.textContent = input.type === "password" ? "Show" : "Hide";
  });
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    message.textContent = "Checking access…";
    const submitted = await digest(input.value);
    if (submitted !== ACCESS_HASH) {
      message.textContent = "The company password is incorrect.";
      input.select();
      return;
    }
    sessionStorage.setItem(ACCESS_KEY, "active");
    const requested = new URLSearchParams(location.search).get("next");
    const destination = requested && !requested.includes("://") ? requested : siteBase();
    location.replace(destination);
  });
})();
