"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, register, resendVerification, type Role } from "@/lib/api";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { dashboardFor, persistSession } from "@/lib/session";

/**
 * Registration screen.
 *
 * Shares the light two-column AUCA layout with the login screen: form on the
 * left, campus photo on the right. It previously used white-on-dark styling,
 * which made the two auth screens look like different products.
 */
export function AuthRegisterForm() {
  const router = useRouter();
  const [institution, setInstitution] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await register({
        email,
        password,
        name: String(fd.get("fullName") ?? ""),
        institution: String(fd.get("institution") ?? ""),
      });
      // Requirement 1 — registration no longer signs the user in. They go to a
      // holding page until the emailed link is followed.
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_UNVERIFIED") {
        setUnverifiedEmail(email);
        setError(`${err.message} Resend the link to finish activating it.`);
      } else {
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    try {
      const res = await resendVerification(unverifiedEmail);
      setNotice(res.message);
      setError(null);
      router.push(`/check-email?email=${encodeURIComponent(unverifiedEmail)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the verification email");
    }
  };

  return (
    <main className="jida-auth-screen">
      <section className="jida-auth-form-side" aria-labelledby="register-title">
        <div className="jida-auth-logo">
          <span className="jida-auth-logo-badge">J</span>
          <div>
            <strong>JIDA System</strong>
            <small>Journal of Inter-Discourse Academia</small>
          </div>
        </div>

        <div className="jida-auth-form-body">
          <h1 id="register-title">Create your account</h1>
          <p className="jida-auth-subtitle">
            Join JIDA to submit, review, or edit scholarly work.
          </p>

          <form className="jida-login-form" onSubmit={handleSubmit}>
            {error ? (
              <div className="jida-auth-error" role="alert">
                <p>{error}</p>
                {unverifiedEmail ? (
                  <button
                    type="button"
                    className="jida-link-btn"
                    onClick={() => void handleResend()}
                  >
                    Resend verification email
                  </button>
                ) : null}
              </div>
            ) : null}

            {notice ? (
              <p className="jida-auth-notice" role="status">
                {notice}
              </p>
            ) : null}

            {/* No role picker. Signing up creates an author account — the only
                role anyone may give themselves. Reviewers are invited by an
                editor, and editors are appointed by an admin. */}
            <p className="jida-auth-role-note">
              Signing up creates an <strong>author account</strong>, for submitting
              manuscripts to JIDA. Reviewers and editors are invited by the
              editorial team.
            </p>

            <div className="jida-login-field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                name="fullName"
                placeholder="Ada Lovelace"
                autoComplete="name"
                required
              />
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
              <div className="jida-password-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="jida-password-toggle"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="jida-login-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="jida-password-wrap">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="jida-password-toggle"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="jida-login-field">
              <label htmlFor="institution">Institution</label>
              <input
                id="institution"
                type="text"
                name="institution"
                placeholder="Adventist University of Central Africa"
                autoComplete="organization"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>

            <p className="jida-auth-hint">
              We&apos;ll email you a link to verify this address. Your account stays inactive
              until you confirm it.
            </p>

            <button type="submit" className="jida-login-btn" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          {/* Google accounts skip verification — Google has already done it. */}
          <GoogleSignInButton
            text="signup_with"
            institution={institution}
            onSuccess={(session) => {
              const actualRole = persistSession(session);
              router.push(dashboardFor(actualRole));
            }}
            onError={(message) => setError(message)}
          />

          <p className="jida-auth-signup-link">
            Already have an account? <Link href="/login">Login here</Link>
          </p>
        </div>
      </section>

      <div className="jida-auth-photo-side" aria-hidden="true" />
    </main>
  );
}
