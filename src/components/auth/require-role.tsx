"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/api";
import { clearSession, isTokenExpired, readRole, readToken } from "@/lib/session";

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = readToken();
    const storedRole = readRole();

    if (!token || storedRole !== role || isTokenExpired(token)) {
      clearSession();
      router.replace("/login");
      return;
    }
    setAuthorized(true);
  }, [role, router]);

  if (!authorized) return null;

  return <>{children}</>;
}
