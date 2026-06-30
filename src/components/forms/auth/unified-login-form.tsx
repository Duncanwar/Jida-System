"use client";

import Link from "next/link";
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

  return (
    <main className="jida-auth-screen">
      <section className="jida-auth-form-side" aria-labelledby="login-title">
        <div className="jida-auth-logo">
          <span className="jida-auth-logo-badge">J</span>
          <div>
            <strong>JIDA System</strong>
            <small>Journal of Inter-Discourse Academia</small>
          </div>
        </div>

        <div className="jida-auth-form-body">
          <h1 id="login-title">Login</h1>
          <p className="jida-auth-subtitle">Welcome! Please enter your details.</p>

          <form className="jida-login-form" onSubmit={handleSubmit}>
            {error ? <p className="jida-auth-error">{error}</p> : null}

            <div className="jida-login-field">
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

            <div className="jida-login-field">
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

            <div className="jida-login-field">
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

            <button type="submit" className="jida-login-btn" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="jida-auth-signup-link">
            Don&apos;t have an account?{" "}
            <Link href="/register">Sign Up</Link>
          </p>
        </div>
      </section>

      <div className="jida-auth-photo-side" aria-hidden="true" />
    </main>
  );
}
