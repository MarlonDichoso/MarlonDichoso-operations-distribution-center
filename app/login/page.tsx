"use client";

import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/employee/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setSignedIn(Boolean(result.authenticated)))
      .catch(() => setSignedIn(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("company-password") || "");

    try {
      const response = await fetch("/api/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");

      const requested = new URLSearchParams(window.location.search).get("next");
      const destination =
        requested && requested.startsWith("/") && !requested.startsWith("//")
          ? requested
          : "/";
      window.location.href = destination;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await fetch("/api/employee/logout", { method: "POST" }).catch(() => null);
    setSignedIn(false);
    setBusy(false);
    setMessage("You have signed out of the employee workspace.");
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand">
          <span className="brand-mark">
            <span className="brand-letter">O</span>
          </span>
          <div>
            <strong>Operations Distribution Center</strong>
            <span>Property workspace</span>
          </div>
        </div>

        <div className="purpose-note">
          <span>DEDICATED OPERATIONS TOOL</span>
          <p>
            Built exclusively to support the work of{" "}
            <strong>Akolong Technologies</strong> and{" "}
            <strong>Savanna Impala LLC.</strong>
          </p>
        </div>

        <div className="login-intro">
          <p className="login-eyebrow">ONE SECURE WORKSPACE</p>
          <h1>Administrative and maintenance work, together.</h1>
          <p>
            Enter the company access password to open Task Management and
            Maintenance &amp; Vendors in one connected workspace.
          </p>
        </div>

        <div className="login-app-list">
          <article>
            <span className="login-app-icon tasks">✓</span>
            <div>
              <strong>Task Management</strong>
              <small>Assignments, priorities, projects, and reporting</small>
            </div>
          </article>
          <article>
            <span className="login-app-icon maintenance">⌂</span>
            <div>
              <strong>Maintenance &amp; Vendors</strong>
              <small>Work orders, properties, vendors, and estimates</small>
            </div>
          </article>
        </div>

        <div className="login-security">
          <span>●</span>
          Employee access · Shared database · Activity history
        </div>
      </section>

      <section className="login-form-panel">
        <button
          className="back-to-preview"
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          ← Back to workspace
        </button>

        <div className="login-card">
          <div className="mobile-login-brand">
            <span className="brand-mark compact">
              <span className="brand-letter">O</span>
            </span>
            <strong>Operations Distribution Center</strong>
          </div>

          <p className="login-card-eyebrow">EMPLOYEE ACCESS</p>
          <h2>{signedIn ? "Workspace access is active" : "Access the company workspace"}</h2>
          <p className="login-subtitle">
            {signedIn
              ? "This device is currently signed in to the Operations Distribution Center."
              : "Enter the company password provided in your internal information sheet."}
          </p>

          {signedIn ? (
            <>
              <button
                className="sign-in-button"
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Open Workspace <span>→</span>
              </button>
              <button
                className="tech-admin-link"
                type="button"
                onClick={signOut}
                disabled={busy}
              >
                {busy ? "Signing out..." : "Sign out"}
              </button>
            </>
          ) : (
            <form onSubmit={submit}>
              <label>
                Company Access Password
                <div className="login-input">
                  <span>◇</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="company-password"
                    autoComplete="current-password"
                    placeholder="Enter the company password"
                    required
                  />
                  <button
                    className="show-password"
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <button className="sign-in-button" type="submit" disabled={busy}>
                {busy ? "Checking access..." : "Access Workspace"}
                <span>→</span>
              </button>
            </form>
          )}

          {message && <div className="login-message">{message}</div>}

          <p className="login-help">
            For employees of Akolong Technologies and Savanna Impala LLC only.
          </p>
          <button
            className="tech-admin-link"
            type="button"
            onClick={() => {
              window.location.href = "/tech-admin";
            }}
          >
            Tech Admin Login
          </button>
        </div>

        <footer>
          Protected internal employee access
        </footer>
      </section>
    </main>
  );
}
