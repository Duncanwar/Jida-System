"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/api";
import { canAccessRole, clearSession, isTokenExpired, readRoles, readToken } from "@/lib/session";

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = readToken();

    if (!token || isTokenExpired(token)) {
      clearSession();
      router.replace("/login");
      return;
    }

    // Checks every role the account holds, not just the one it landed on — a
    // chief editor moving to the reviewer portal still has a "role" of
    // CHIEF_EDITOR, and comparing that alone would bounce them to /login.
    if (!canAccessRole(readRoles(), role)) {
      router.replace("/");
      return;
    }

    setAuthorized(true);
  }, [role, router]);

  if (!authorized) return null;

  return <>{children}</>;
}
