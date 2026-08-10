import type { AuthSession, Role } from "@/lib/api";

/**
 * Single place that decides where a signed-in user lands and how the session is
 * persisted. Previously each form wrote localStorage itself and derived the
 * destination inline, which is how the role dropdown and the real role drifted
 * apart.
 */

export const dashboardByRole: Record<Role, string> = {
  AUTHOR: "/author",
  REVIEWER: "/reviewer",
  EDITOR: "/editor",
  ADMIN: "/admin",
};

export function persistSession(session: AuthSession): Role {
  if (typeof window === "undefined") return session.user.role;
  localStorage.setItem("token", session.accessToken);
  localStorage.setItem("role", session.user.role);
  localStorage.setItem("email", session.user.email);
  return session.user.role;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
}

/**
 * Reads the `exp` claim out of a JWT without verifying its signature — that's
 * the backend's job. This is only used to decide whether to bounce the user
 * back to /login before bothering to make a request with a dead token.
 */
export function isTokenExpired(token: string): boolean {
  const payloadSegment = token.split(".")[1];
  if (!payloadSegment) return true;
  try {
    const json = atob(payloadSegment.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function dashboardFor(role: Role): string {
  return dashboardByRole[role] ?? "/";
}
