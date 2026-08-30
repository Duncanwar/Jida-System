"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { unsubscribeNewsletter } from "@/lib/api";

type State =
  | { kind: "working" }
  | { kind: "done"; email: string }
  | { kind: "error"; message: string };

/**
 * Landing page for the unsubscribe link in every newsletter email.
 *
 * Works signed-out — newsletter readers have no account, and the token in the
 * link is the only credential. It runs on load rather than behind a confirm
 * button: a reader who clicked "unsubscribe" has already decided, and making
 * them click twice is how people give up and press "report spam" instead.
 */
export default function UnsubscribePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [state, setState] = useState<State>({ kind: "working" });
  // React runs effects twice in development; without this the second run hits
  // an already-unsubscribed token.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    unsubscribeNewsletter(token)
      .then((res) => setState({ kind: "done", email: res.email }))
      .catch((e: unknown) =>
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "This unsubscribe link is not valid.",
        }),
      );
  }, [token]);

  return (
    <main className="jida-verify-screen">
      <section className="jida-verify-card" aria-live="polite">
        <div className="jida-auth-logo">
          <span className="jida-auth-logo-badge">J</span>
          <div>
            <strong>JIDA System</strong>
            <small>Journal of Inter-Discourse Academia</small>
          </div>
        </div>

        {state.kind === "working" && <p className="jida-verify-status">Removing your address…</p>}

        {state.kind === "done" && (
          <>
            <h1>You have been unsubscribed</h1>
            <p className="jida-verify-status">
              We will no longer email <strong>{state.email}</strong> about new issues or calls for
              papers.
            </p>
            <p className="jida-verify-status">
              The archive stays free to read — no subscription is needed.
            </p>
            <Link href="/archive" className="jida-login-btn">Browse the archive</Link>
          </>
        )}

        {state.kind === "error" && (
          <>
            <h1>Link unavailable</h1>
            <p className="jida-verify-error">{state.message}</p>
            <Link href="/" className="jida-login-btn">Go to JIDA</Link>
          </>
        )}
      </section>
    </main>
  );
}
