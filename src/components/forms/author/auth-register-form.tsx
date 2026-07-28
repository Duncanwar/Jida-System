"use client";

import { Mail, User, Eye, EyeOff } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, register, resendVerification, type Role } from "@/lib/api";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { dashboardFor, persistSession } from "@/lib/session";

export function AuthRegisterForm() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const router = useRouter();
  const [role, setRole] = useState<Role>("AUTHOR");
  const [institution, setInstitution] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (el) {
      el.style.opacity = "0";
      setTimeout(() => {
        el.style.transition = "opacity 1s ease-in-out";
        el.style.opacity = "1";
      }, 500);
    }
  }, []);

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
        role,
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
    <div>
      <section ref={sectionRef}>
        <form id="author-register-form" onSubmit={handleSubmit}>
          <h1>Registration</h1>

          {error && (
            <div style={{ color: "red", marginBottom: "0.5rem" }} role="alert">
              <p>{error}</p>
              {unverifiedEmail ? (
                <button type="button" className="jida-link-btn" onClick={() => void handleResend()}>
                  Resend verification email
                </button>
              ) : null}
            </div>
          )}

          {notice && (
            <p style={{ color: "green", marginBottom: "0.5rem" }} role="status">
              {notice}
            </p>
          )}

          <div className="inputbox">
            <User className="input-icon" />
            <label>Role</label>
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              style={{ width: "100%" }}
            >
              <option value="AUTHOR">Author</option>
              <option value="REVIEWER">Reviewer</option>
              <option value="EDITOR">Editor</option>
            </select>
          </div>

          <div className="inputbox">
            <User className="input-icon" />
            <label>Full Name</label>
            <input type="text" name="fullName" required />
          </div>

          <div className="inputbox">
            <Mail className="input-icon" />
            <label>Email</label>
            <input type="email" name="email" required />
          </div>

          <div className="inputbox">
            <div className="input-icon" onClick={() => setShowPassword((p) => !p)}>
              {showPassword ? <EyeOff /> : <Eye />}
            </div>
            <label>Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              minLength={8}
              required
            />
          </div>

          <div className="inputbox">
            <div className="input-icon" onClick={() => setShowConfirmPassword((p) => !p)}>
              {showConfirmPassword ? <EyeOff /> : <Eye />}
            </div>
            <label>Confirm Password</label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              minLength={8}
              required
            />
          </div>

          <div className="inputbox">
            <User className="input-icon" />
            <label>Institution</label>
            <input
              type="text"
              name="institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          </div>

          <p className="jida-auth-hint">
            We will email you a link to verify this address. Your account stays inactive until you
            confirm it.
          </p>

          <button type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Register"}
          </button>

          {/* Google accounts skip verification — Google has already done it. */}
          <GoogleSignInButton
            text="signup_with"
            role={role}
            institution={institution}
            onSuccess={(session) => {
              const actualRole = persistSession(session);
              router.push(dashboardFor(actualRole));
            }}
            onError={(message) => setError(message)}
          />

          <div className="register">
            <p>
              Already have an account?{" "}
              <a onClick={() => router.push("/login")} style={{ cursor: "pointer" }}>
                Login here
              </a>
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
