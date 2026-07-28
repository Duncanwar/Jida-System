"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, resendVerification, verifyEmail } from "@/lib/api";
import { dashboardFor, persistSession } from "@/lib/session";

type State =
  | { kind: "verifying" }
  | { kind: "success"; message: string; redirectTo: string }
  | { kind: "expired"; message: string }
  | { kind: "error"; message: string };

export function VerifyEmailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>({ kind: "verifying" });
  const [resendEmail, setResendEmail] = useState("");
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // React 18 StrictMode double-invokes effects in development. The token is
  // single-use, so a second call would report "already used" and confuse the
  // user — guard the request rather than the effect.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "This link is missing its verification token." });
      return;
    }
    if (attempted.current) return;
    attempted.current = true;

    verifyEmail(token)
      .then((session) => {
        const role = persistSession(session);
        const redirectTo = dashboardFor(role);
        setState({ kind: "success", message: session.message ?? "Email verified.", redirectTo });
        // Short pause so the confirmation is actually readable before the jump.
        setTimeout(() => router.push(redirectTo), 1800);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.code === "TOKEN_EXPIRED") {
          setState({ kind: "expired", message: err.message });
          return;
        }
        setState({
          kind: "error",
          message:
            err instanceof Error ? err.message : "We could not verify this link. Please try again.",
        });
      });
  }, [token, router]);

  const handleResend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResending(true);
    setResendNotice(null);
    try {
      const res = await resendVerification(resendEmail.trim());
      setResendNotice(res.message);
    } catch (err) {
      setResendNotice(
        err instanceof Error ? err.message : "Could not send a new verification email.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="jida-verify-screen">
      <section className="jida-verify-card" aria-live="polite">
        <div className="jida-auth-logo">
          <span className="jida-auth-logo-badge">J</span>
          <div>
            <strong>JIDA System</strong>
            <small>Journal of Inter-Discourse Academia</small>
          </div>
        </div>

        {state.kind === "verifying" && (
          <>
            <h1>Verifying your email…</h1>
            <p className="jida-verify-status">One moment while we confirm your link.</p>
          </>
        )}

        {state.kind === "success" && (
          <>
            <h1>You&apos;re all set</h1>
            <p className="jida-verify-status jida-verify-success">{state.message}</p>
            <p>Taking you to your dashboard…</p>
            <Link href={state.redirectTo} className="jida-login-btn">
              Continue now
            </Link>
          </>
        )}

        {(state.kind === "expired" || state.kind === "error") && (
          <>
            <h1>{state.kind === "expired" ? "This link has expired" : "We couldn't verify that link"}</h1>
            <p className="jida-verify-status jida-verify-error">{state.message}</p>

            <form className="jida-login-form" onSubmit={(e) => void handleResend(e)}>
              <div className="jida-login-field">
                <label htmlFor="resend-email">Enter your email to get a new link</label>
                <input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <button type="submit" className="jida-login-btn" disabled={resending}>
                {resending ? "Sending…" : "Send a new link"}
              </button>
            </form>

            {resendNotice ? (
              <p className="jida-verify-status" role="status">
                {resendNotice}
              </p>
            ) : null}

            <p className="jida-auth-signup-link">
              <Link href="/login">Back to login</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
