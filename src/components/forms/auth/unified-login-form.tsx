"use client";

import Link from "next/link";
import { ApiError, login, resendVerification, type Role } from "@/lib/api";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { dashboardFor, persistSession } from "@/lib/session";

export function UnifiedLoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("AUTHOR");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Set when the API rejects the login because the address is unverified. */
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const completeSignIn = (session: Parameters<typeof persistSession>[0], selectedRole: Role) => {
    const actualRole = persistSession(session);
    if (actualRole !== selectedRole) {
      // Trust the server's role, not the dropdown — but say so, rather than
      // silently dropping the user somewhere they did not expect.
      setNotice(
        `This account is registered as ${actualRole.toLowerCase()}. Opening your ${actualRole.toLowerCase()} workspace.`,
      );
    }
    router.push(dashboardFor(actualRole));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const emailValue = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const result = await login(emailValue, password, role);
      completeSignIn(result, role);
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        // Requirement 1 — surface the gate with a way out, not a dead end.
        setUnverifiedEmail(emailValue);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    setError(null);
    try {
      const res = await resendVerification(unverifiedEmail);
      setNotice(res.message);
      setUnverifiedEmail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the verification email");
    } finally {
      setResending(false);
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
            {error ? (
              <div className="jida-auth-error" role="alert">
                <p>{error}</p>
                {unverifiedEmail ? (
                  <button
                    type="button"
                    className="jida-link-btn"
                    onClick={() => void handleResend()}
                    disabled={resending}
                  >
                    {resending ? "Sending…" : "Resend verification email"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {notice ? (
              <p className="jida-auth-notice" role="status">
                {notice}
              </p>
            ) : null}

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
                <option value="ADMIN">Admin</option>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

          <GoogleSignInButton
            text="signin_with"
            role={role === "ADMIN" ? undefined : role}
            onSuccess={(session) => completeSignIn(session, role)}
            onError={(message) => setError(message)}
          />

          <p className="jida-auth-forgot-link">
            <Link href="/reset-password">Forgot your password?</Link>
          </p>

          <p className="jida-auth-signup-link">
            Don&apos;t have an account? <Link href="/register">Sign Up</Link>
          </p>
        </div>
      </section>

      <div className="jida-auth-photo-side" aria-hidden="true" />
    </main>
  );
}
