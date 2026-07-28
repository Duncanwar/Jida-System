"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/api";

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");

    if (!token || storedRole !== role) {
      router.replace("/login");
      return;
    }
    setAuthorized(true);
  }, [role, router]);

  if (!authorized) return null;

  return <>{children}</>;
}
