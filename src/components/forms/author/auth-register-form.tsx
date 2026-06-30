"use client";

import { Mail, User, Eye, EyeOff } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { register, type Role } from "@/lib/api";

export function AuthRegisterForm() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const router = useRouter();
  const [role, setRole] = useState<Role>("AUTHOR");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        email: String(fd.get("email") ?? ""),
        password,
        role,
        name: String(fd.get("fullName") ?? ""),
        institution: String(fd.get("institution") ?? ""),
      });
      localStorage.setItem("token", result.accessToken);
      localStorage.setItem("role", role);
      const dest = role === "AUTHOR" ? "/author" : role === "REVIEWER" ? "/reviewer" : "/editor";
      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <section ref={sectionRef}>
        <form id="author-register-form" onSubmit={handleSubmit}>
          <h1>Registration</h1>

          {error && <p style={{ color: "red", marginBottom: "0.5rem" }}>{error}</p>}

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
            <input type={showPassword ? "text" : "password"} name="password" required />
          </div>

          <div className="inputbox">
            <div className="input-icon" onClick={() => setShowConfirmPassword((p) => !p)}>
              {showConfirmPassword ? <EyeOff /> : <Eye />}
            </div>
            <label>Confirm Password</label>
            <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" required />
          </div>

          <div className="inputbox">
            <User className="input-icon" />
            <label>Institution</label>
            <input type="text" name="institution" />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Registering…" : "Register"}
          </button>
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
