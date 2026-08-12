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

/**
 * Safari (Private Browsing, or with cross-site tracking prevention on) throws
 * `SecurityError: The operation is insecure` on any localStorage call instead
 * of just returning null/no-op like other browsers. Swallow that so a blocked
 * storage jar degrades to "signed out" rather than crashing the app.
 */
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function persistSession(session: AuthSession): Role {
  if (typeof window === "undefined") return session.user.role;
  safeSet("token", session.accessToken);
  safeSet("role", session.user.role);
  safeSet("email", session.user.email);
  return session.user.role;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  safeRemove("token");
  safeRemove("role");
  safeRemove("email");
}

export function readToken(): string | null {
  return typeof window === "undefined" ? null : safeGet("token");
}

export function readRole(): string | null {
  return typeof window === "undefined" ? null : safeGet("role");
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
