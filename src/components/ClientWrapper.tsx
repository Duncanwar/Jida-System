"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/login" || pathname === "/register") {
      document.body.classList.add("auth-page");
    } else {
      document.body.classList.remove("auth-page");
    }
  }, [pathname]);

  return children;
}
