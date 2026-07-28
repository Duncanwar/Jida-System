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

export function dashboardFor(role: Role): string {
  return dashboardByRole[role] ?? "/";
}
