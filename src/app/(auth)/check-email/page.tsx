import { Suspense } from "react";
import { CheckEmailView } from "@/components/auth/check-email-view";

/**
 * FR-AUTH-1 — the holding page a new registrant lands on. The account exists
 * but is inactive until the emailed link is followed.
 */
export const metadata = {
  title: "Check your email — JIDA",
};

export default function CheckEmailRoute() {
  return (
    <Suspense fallback={<p className="jida-verify-status">Loading…</p>}>
      <CheckEmailView />
    </Suspense>
  );
}
