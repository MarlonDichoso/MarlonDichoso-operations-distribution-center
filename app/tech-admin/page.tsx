"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function TechAdminLoginPage() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Verifying Tech Admin access...");
    try {
      const response = await fetch("/api/tech-admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      const requested = searchParams.get("returnTo");
      window.location.href = requested?.startsWith("/") && !requested.startsWith("//")
        ? requested
        : "/data-control";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <button type="button" className="admin-back" onClick={() => { window.location.href = "/login"; }}>
          ← Employee login
        </button>
        <span className="brand-mark admin-login-mark"><span className="brand-letter">U</span></span>
        <p className="login-card-eyebrow">RESTRICTED SYSTEM AREA</p>
        <h1>Tech Admin Login</h1>
        <p>Use the private Tech Admin password. The employee company password cannot open Data Control.</p>
        <form onSubmit={submit}>
          <label>
            Tech Admin Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              autoFocus
            />
          </label>
          <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Open Tech Admin Console"}</button>
        </form>
        {message && <div className="login-message">{message}</div>}
        <small>For authorized system administration only.</small>
      </section>
    </main>
  );
}

