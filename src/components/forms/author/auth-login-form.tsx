"use client";

import { Mail, Eye, EyeOff } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export function AuthLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const sectionRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    const loginForm = sectionRef.current;
    if (loginForm) {
      loginForm.style.opacity = "0";
      setTimeout(() => {
        loginForm.style.transition = "opacity 1s ease-in-out";
        loginForm.style.opacity = "1";
      }, 500);
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      const data = await login(email, password, "AUTHOR");
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("role", "AUTHOR");
      router.push("/author");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section ref={sectionRef}>
      <form id="author-login" onSubmit={handleSubmit}>
        <h1>Author Login</h1>
        {error && <p className="error-message">{error}</p>}
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
        <div className="remember-forgot">
          <label><input type="checkbox" name="rememberMe" />Remember Me</label>
          <a href="/reset-password">Forgot Password?</a>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Login"}
        </button>
        <div className="register">
          <p>
            Don&apos;t have an account?{" "}
            <a onClick={() => router.push("/signup")} style={{ cursor: "pointer" }}>
              Sign up here
            </a>
          </p>
        </div>
      </form>
    </section>
  );
}
