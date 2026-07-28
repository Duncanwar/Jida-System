"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getVerificationStatus, resendVerification } from "@/lib/api";

const RESEND_COOLDOWN_SEC = 60;
const POLL_INTERVAL_MS = 5000;

export function CheckEmailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Countdown for the resend button, mirroring the server-side cooldown so the
  // user is not invited to click into a 429.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // If the user verifies in another tab (the usual case — they click the link
  // in their mail client), move this tab along instead of stranding it.
  useEffect(() => {
    if (!email) return;
    let cancelled = false;

    const poll = setInterval(() => {
      void getVerificationStatus(email)
        .then((res) => {
          if (!cancelled && res.emailVerified) {
            clearInterval(poll);
            router.push("/login");
          }
        })
        .catch(() => {
          /* transient network errors are not worth surfacing here */
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [email, router]);

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await resendVerification(email);
      setNotice(res.message);
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the verification email.");
      setCooldown(RESEND_COOLDOWN_SEC);
    } finally {
      setSending(false);
    }
  }, [email, cooldown]);

  return (
    <main className="jida-verify-screen">
      <section className="jida-verify-card">
        <div className="jida-auth-logo">
          <span className="jida-auth-logo-badge">J</span>
          <div>
            <strong>JIDA System</strong>
            <small>Journal of Inter-Discourse Academia</small>
          </div>
        </div>

        <h1>Check your inbox</h1>
        <p className="jida-verify-status">
          {email ? (
            <>
              We sent a verification link to <strong>{email}</strong>. Click it to activate your
              account.
            </>
          ) : (
            <>We sent you a verification link. Click it to activate your account.</>
          )}
        </p>

        <ul className="jida-verify-tips">
          <li>The link expires in 24 hours and can be used once.</li>
          <li>Check your spam or promotions folder if it hasn&apos;t arrived.</li>
          <li>You can&apos;t sign in until the address is verified.</li>
        </ul>

        {notice ? (
          <p className="jida-verify-status jida-verify-success" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="jida-verify-status jida-verify-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="jida-login-btn"
          onClick={() => void handleResend()}
          disabled={!email || sending || cooldown > 0}
        >
          {sending
            ? "Sending…"
            : cooldown > 0
              ? `Resend available in ${cooldown}s`
              : "Resend verification email"}
        </button>

        <p className="jida-auth-signup-link">
          Wrong address? <Link href="/register">Register again</Link> · <Link href="/login">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
