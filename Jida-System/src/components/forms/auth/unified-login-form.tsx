"use client";

import { loginByRole, type LoginRole } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

const routeByRole: Record<LoginRole, string> = {
  author: "/author",
  reviewer: "/reviewer",
  editor: "/editor",
};

export function UnifiedLoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>("author");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const result = await loginByRole(role, email, password);
      localStorage.setItem("token", result.token);
      localStorage.setItem("role", role);
      router.push(routeByRole[role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <section>
        <form id="unified-login" onSubmit={handleSubmit}>
          <h1>JIDA Login</h1>
          <p className="jida-auth-copy">Select your role and sign in.</p>

          {error ? <p className="jida-auth-error">{error}</p> : null}

          <div className="inputbox">
            <label>Role</label>
            <select name="role" value={role} onChange={(e) => setRole(e.target.value as LoginRole)}>
              <option value="author">Author</option>
              <option value="reviewer">Reviewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>

          <div className="inputbox">
            <label>Email</label>
            <input type="email" name="email" required />
          </div>

          <div className="inputbox">
            <label>Password</label>
            <input type="password" name="password" required />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : `Login as ${role}`}
          </button>
        </form>
      </section>
    </div>
  );
}

