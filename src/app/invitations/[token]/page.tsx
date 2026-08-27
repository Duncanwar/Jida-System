"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Mail, X } from "lucide-react";
import {
  acceptInvitation,
  declineInvitation,
  getInvitation,
  type InvitationInfo,
} from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "ready"; info: InvitationInfo }
  | { kind: "declining"; info: InvitationInfo }
  | { kind: "done"; tone: "accepted" | "declined"; message: string; showLogin: boolean }
  | { kind: "error"; message: string };

/** Common reasons offered as one-tap chips, so most people never have to type. */
const DECLINE_REASONS = [
  "Outside my area of expertise",
  "No capacity right now",
  "Possible conflict of interest",
  "Prefer not to say",
];

/**
 * Public landing page for the accept / decline links in reviewer-invitation
 * and review-assignment emails. Works signed-out — the token is the only
 * credential.
 */
export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [state, setState] = useState<State>({ kind: "loading" });
  const [pickedReason, setPickedReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getInvitation(token)
      .then((info) => {
        if (info.status !== "PENDING") {
          setState({
            kind: "error",
            message: `This ${info.type === "ASSIGNMENT" ? "assignment" : "invitation"} was already ${info.status.toLowerCase()}.`,
          });
        } else {
          setState({ kind: "ready", info });
        }
      })
      .catch((e: unknown) =>
        setState({ kind: "error", message: e instanceof Error ? e.message : "This link is not valid." }),
      );
  }, [token]);

  async function handleAccept(info: InvitationInfo) {
    setBusy(true);
    try {
      const res = await acceptInvitation(
        token,
        info.needsAccount ? { name: name.trim() || undefined, password } : {},
      );
      setState({
        kind: "done",
        tone: "accepted",
        message:
          info.type === "ASSIGNMENT"
            ? "You've accepted this review assignment. Sign in to open the manuscript and the review form."
            : res.accountCreated
              ? "Your reviewer account is ready. Sign in to see your first assignment."
              : "You're now on the JIDA reviewer panel. Sign in to see your assignments.",
        showLogin: true,
      });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Could not accept." });
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    const reason = [pickedReason, note.trim()].filter(Boolean).join(" — ") || "Prefer not to say";
    setBusy(true);
    try {
      await declineInvitation(token, reason);
      setState({
        kind: "done",
        tone: "declined",
        message: "Thanks for letting us know — the editor has been notified. Nothing more to do.",
        showLogin: false,
      });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Could not decline." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="jida-invitation-screen">
      <section className="jida-invitation-card" aria-live="polite">
        <div className="jida-invitation-brand">
          <span className="jida-invitation-brand-badge">J</span>
          <div>
            <strong>JIDA</strong>
            <span>Journal of Inter-Discourse Academia</span>
          </div>
        </div>

        {state.kind === "loading" && (
          <p className="jida-invitation-muted">Opening your invitation…</p>
        )}

        {state.kind === "error" && (
          <div className="jida-invitation-body jida-invitation-centered">
            <div className="jida-invitation-status-icon error"><X size={22} /></div>
            <h1>This link can’t be opened</h1>
            <p className="jida-invitation-muted">{state.message}</p>
            <Link href="/" className="jida-btn-primary jida-invitation-full-btn">Go to JIDA</Link>
          </div>
        )}

        {state.kind === "done" && (
          <div className="jida-invitation-body jida-invitation-centered">
            <div className={`jida-invitation-status-icon ${state.tone === "accepted" ? "ok" : "neutral"}`}>
              {state.tone === "accepted" ? <Check size={22} /> : <Mail size={22} />}
            </div>
            <h1>{state.tone === "accepted" ? "You’re all set" : "Response sent"}</h1>
            <p className="jida-invitation-muted">{state.message}</p>
            {state.showLogin ? (
              <Link href="/login" className="jida-btn-primary jida-invitation-full-btn">Sign in</Link>
            ) : (
              <Link href="/" className="jida-btn-secondary jida-invitation-full-btn">Go to JIDA</Link>
            )}
          </div>
        )}

        {state.kind === "ready" && (
          <div className="jida-invitation-body">
            <p className="jida-invitation-kicker">
              {state.info.type === "ASSIGNMENT" ? "Review assignment" : "Reviewer invitation"}
            </p>
            <h1>
              {state.info.type === "ASSIGNMENT"
                ? "You’ve been asked to review a manuscript"
                : "You’ve been invited to review for JIDA"}
            </h1>
            <p className="jida-invitation-lead">
              {state.info.type === "ASSIGNMENT"
                ? "Peer review here is blind — the authors’ identities stay hidden throughout."
                : "An editor would like to add you to the reviewer panel. You choose which manuscripts you take on."}
            </p>

            <dl className="jida-invitation-summary">
              {state.info.type === "ASSIGNMENT" && state.info.title && (
                <div>
                  <dt>Manuscript</dt>
                  <dd>{state.info.title}</dd>
                </div>
              )}
              <div>
                <dt>Sent to</dt>
                <dd>{state.info.email}</dd>
              </div>
            </dl>

            {state.info.needsAccount && (
              <div className="jida-invitation-fields">
                <label>
                  Your name
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" />
                </label>
                <label>
                  Choose a password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <small>You’ll use this with {state.info.email} to sign in.</small>
                </label>
              </div>
            )}

            <div className="jida-invitation-actions">
              <button
                type="button"
                className="jida-btn-primary jida-invitation-full-btn"
                disabled={busy || (state.info.needsAccount && password.length < 8)}
                onClick={() => handleAccept(state.info)}
              >
                {busy ? "Working…" : state.info.type === "ASSIGNMENT" ? "Accept assignment" : "Accept & join"}
              </button>
              <button
                type="button"
                className="jida-invitation-link-btn"
                disabled={busy}
                onClick={() => { setPickedReason(null); setNote(""); setState({ kind: "declining", info: state.info }); }}
              >
                Not right now — decline
              </button>
            </div>
          </div>
        )}

        {state.kind === "declining" && (
          <div className="jida-invitation-body">
            <p className="jida-invitation-kicker">Declining</p>
            <h1>No problem at all</h1>
            <p className="jida-invitation-lead">
              A one-tap reason is all the editor needs to line someone else up. Add a note only if you want to.
            </p>

            <div className="jida-invitation-reasons" role="group" aria-label="Reason for declining">
              {DECLINE_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`jida-invitation-chip${pickedReason === r ? " selected" : ""}`}
                  aria-pressed={pickedReason === r}
                  onClick={() => setPickedReason(pickedReason === r ? null : r)}
                >
                  {pickedReason === r && <Check size={14} />}
                  {r}
                </button>
              ))}
            </div>

            <label className="jida-invitation-note-label">
              Note <span>(optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Anything you'd like the editor to know"
              />
            </label>

            <div className="jida-invitation-actions">
              <button
                type="button"
                className="jida-btn-primary jida-invitation-full-btn"
                disabled={busy || (!pickedReason && !note.trim())}
                onClick={handleDecline}
              >
                {busy ? "Sending…" : `Send response`}
              </button>
              <button
                type="button"
                className="jida-invitation-link-btn"
                disabled={busy}
                onClick={() => setState({ kind: "ready", info: state.info })}
              >
                Back
              </button>
            </div>
          </div>
        )}

        <p className="jida-invitation-footnote">
          You received this because an editor entered your email in JIDA. This link is single-use.
        </p>
      </section>
    </main>
  );
}
