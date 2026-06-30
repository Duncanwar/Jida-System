"use client";

import { login, type Role } from "@/lib/api";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const routeByRole: Record<Role, string> = {
  AUTHOR: "/author",
  REVIEWER: "/reviewer",
  EDITOR: "/editor",
};

export function UnifiedLoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("AUTHOR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const result = await login(email, password, role);
      localStorage.setItem("token", result.accessToken);
      localStorage.setItem("role", role);
      router.push(routeByRole[role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();

  return (
    <main className="jida-auth-screen">
      <section className="jida-auth-panel" aria-labelledby="login-title">
        <div className="jida-auth-intro">
          <p className="jida-auth-eyebrow">JIDA Digital Platform</p>
          <h1 id="login-title">Welcome back</h1>
          <p>
            Access the right workspace for journal submission, review, and editorial
            publishing workflows.
          </p>

          <div className="jida-auth-highlights" aria-label="Platform highlights">
            <span>Role-based access</span>
            <span>Secure editorial workflows</span>
            <span>Publication tracking</span>
          </div>
        </div>

        <form id="unified-login" className="jida-auth-card" onSubmit={handleSubmit}>
          <div className="jida-auth-card-header">
            <p className="jida-auth-eyebrow">Sign in</p>
            <h2>Choose your workspace</h2>
            <p>Select your role and enter your credentials to continue.</p>
          </div>

          {error ? <p className="jida-auth-error">{error}</p> : null}

          <div className="jida-auth-field">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="AUTHOR">Author</option>
              <option value="REVIEWER">Reviewer</option>
              <option value="EDITOR">Editor</option>
            </select>
          </div>

          <div className="jida-auth-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="jida-auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Signing in…" : `Continue as ${roleLabel}`}
          </button>
        </form>
      </section>
    </main>
  );
}
