import { Suspense } from "react";
import { VerifyEmailView } from "@/components/auth/verify-email-view";

/**
 * FR-AUTH-1 — landing page for the link in the verification email.
 *
 * useSearchParams() forces client rendering, so the view is wrapped in Suspense
 * to keep the rest of the route statically prerenderable.
 */
export const metadata = {
  title: "Verify your email — JIDA",
};

export default function VerifyEmailRoute() {
  return (
    <Suspense fallback={<p className="jida-verify-status">Checking your verification link…</p>}>
      <VerifyEmailView />
    </Suspense>
  );
}
