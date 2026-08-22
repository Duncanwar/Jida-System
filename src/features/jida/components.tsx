"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, X, User } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  getManuscripts,
  submitManuscript,
  submitRevision,
  getMe,
  patchMe,
  getSubmissionSettings,
  downloadFile,
  viewFile,
  getReviewers,
  setScholarReady,
  getAssignments,
  getReviewHistory,
  updateReviewProgress,
  submitReview,
  getEditorSubmissions,
  assignReviewers,
  unassignReviewer,
  uploadEditedFile,
  makeDecision,
  createIssue,
  publishToIssue,
  getPublicIssues,
  getPublicArticles,
  adminGetUsers,
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUserRoles,
  saveReviewerFeedback,
  formatIssueTitle,
  issueArticleCount,
  ASSESSMENT_ITEMS,
  REVIEW_RATINGS,
  RECOMMENDATION_LABELS,
  ROLE_LABELS,
  ApiError,
  type ScholarReadiness,
  type CoAuthor,
  type PublicAuthor,
  type PublicCoAuthor,
  type AuthorVisibleReview,
  type ReviewRating,
  type ReviewFormResult,
  type ManuscriptSummary,
  type Assignment,
  type EditorSubmission,
  type PublicIssue,
  type PublicArticle,
  type ReviewProgress,
  type ReviewRecommendation,
  type AdminUser,
  type UserRole,
  type Role,
  type ReviewerOption,
} from "@/lib/api";
import {
  canAccessRole,
  clearSession,
  dashboardByRole,
  readRole,
  readRoles,
  readToken,
} from "@/lib/session";

// ─── Helpers ───────────────────────────────────────────────────────────────

function statusLabel(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function badgeClass(value: string) {
  const key = value.toLowerCase();
  if (key.includes("finished") || key.includes("accept") || key.includes("published")) return "jida-badge success";
  if (key.includes("progress") || key.includes("review")) return "jida-badge info";
  if (key.includes("reject")) return "jida-badge danger";
  if (key.includes("revision") || key.includes("pending") || key.includes("not_started") || key.includes("not started")) return "jida-badge warning";
  return "jida-badge";
}

// ─── ProfileModal ──────────────────────────────────────────────────────────

function ProfileModal({ onClose }: { onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ email: string; name: string; institution: string } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setProfile({ email: me.email, name: me.name ?? "", institution: me.institution ?? "" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await patchMe({
        name: String(fd.get("name") ?? ""),
        institution: String(fd.get("institution") ?? ""),
      });
      setSaved(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="jida-modal-overlay" onClick={onClose}>
      <div
        className="jida-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Update profile"
      >
        <div className="jida-modal-header">
          <div className="jida-modal-avatar">
            <User size={20} />
          </div>
          <div>
            <p className="jida-section-kicker">Account</p>
            <h3>Your Profile</h3>
          </div>
          <button className="jida-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <p style={{ padding: "1rem" }}>Loading…</p>
        ) : saved ? (
          <div className="jida-modal-saved">
            <span>✓</span>
            <p>Profile updated successfully</p>
          </div>
        ) : (
          <form className="jida-modal-form" onSubmit={handleSave}>
            {error && <p className="jida-modal-error">{error}</p>}
            <label>
              Full Name
              <input type="text" name="name" placeholder="Your full name" defaultValue={profile?.name} />
            </label>
            <label>
              Email
              <input type="email" value={profile?.email ?? ""} disabled readOnly />
            </label>
            <label>
              Institution
              <input type="text" name="institution" placeholder="Institution or affiliation" defaultValue={profile?.institution} />
            </label>
            <div className="jida-modal-actions">
              <button type="submit" className="jida-btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button type="button" className="jida-btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── AppHeader ─────────────────────────────────────────────────────────────

/** Portals a multi-role account can switch between, in a stable order. */
const SWITCHABLE_PORTALS: { role: Role; href: string; label: string }[] = [
  { role: "EDITOR", href: "/editor", label: "Editor" },
  { role: "REVIEWER", href: "/reviewer", label: "Reviewer" },
  { role: "AUTHOR", href: "/author", label: "Author" },
  { role: "ADMIN", href: "/admin", label: "Admin" },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    setUserRole(readRole());
    setUserRoles(readRoles());
    setIsLoggedIn(!!readToken());
  }, [pathname]);

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/archive") ||
    pathname === "/login" ||
    pathname === "/signup";
  // The badge names the account's actual tier ("Chief Editor"), which is more
  // informative than the portal it happens to be viewing.
  const roleLabel = userRole ? (ROLE_LABELS[userRole as Role] ?? userRole) : null;

  // Only portals this account can actually open. A single-role user sees no
  // switcher at all — there is nothing to switch to.
  const availablePortals = SWITCHABLE_PORTALS.filter((p) => canAccessRole(userRoles, p.role));
  const showSwitcher = isLoggedIn && availablePortals.length > 1;
  const homePortal = userRole ? (dashboardByRole[userRole as Role] ?? "/") : "/";

  return (
    <>
      <header className="jida-header">
        <Link href="/" className="jida-header-brand">
          <span className="jida-header-kicker">Journal of Inter-Discourse Academia</span>
          <strong className="jida-header-title">JIDA System</strong>
        </Link>

        <div className="jida-header-right">
          {!isPublicPage && isLoggedIn && roleLabel && (
            <span className="jida-role-badge">{roleLabel}</span>
          )}

          {/* Role switcher — how a chief editor reaches the reviewer and
              author portals their role grants them. */}
          {showSwitcher && (
            <nav className="jida-role-switcher" aria-label="Switch portal">
              {availablePortals.map((portal) => (
                <Link
                  key={portal.href}
                  href={portal.href}
                  className={`jida-role-switch${pathname === portal.href ? " active" : ""}`}
                  aria-current={pathname === portal.href ? "page" : undefined}
                >
                  {portal.label}
                </Link>
              ))}
            </nav>
          )}

          <nav className="jida-header-nav">
            {isPublicPage && (
              <>
                <Link
                  href="/"
                  className={pathname === "/" ? "active" : undefined}
                  aria-current={pathname === "/" ? "page" : undefined}
                >
                  Home
                </Link>
                <Link
                  href="/archive"
                  className={pathname.startsWith("/archive") ? "active" : undefined}
                  aria-current={pathname.startsWith("/archive") ? "page" : undefined}
                >
                  Archive
                </Link>
              </>
            )}

            {isPublicPage && !isLoggedIn && (
              <span className="jida-auth-group" aria-label="Account access">
                <Link href="/login" className="jida-auth-group-login">Login</Link>
                <Link href="/signup" className="jida-auth-group-register">Register</Link>
              </span>
            )}

            {isPublicPage && isLoggedIn && (
              <>
                <Link href={homePortal} className="jida-nav-ghost">
                  My Workspace
                </Link>
                <button
                  type="button"
                  className="jida-settings-btn"
                  onClick={() => setShowProfile(true)}
                  title="Profile settings"
                  aria-label="Open profile settings"
                >
                  <Settings size={16} />
                </button>
                <button type="button" onClick={handleLogout} className="jida-nav-btn">
                  Log out
                </button>
              </>
            )}
            {!isPublicPage && isLoggedIn && (
              <>
                <button
                  type="button"
                  className="jida-settings-btn"
                  onClick={() => setShowProfile(true)}
                  title="Profile settings"
                  aria-label="Open profile settings"
                >
                  <Settings size={16} />
                </button>
                <button type="button" onClick={handleLogout} className="jida-nav-btn">
                  Log out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}

export function NotificationsPanel() {
  return null;
}

// ─── Author hover card ─────────────────────────────────────────────────────

export interface HoverAuthor {
  name?: string | null;
  email?: string | null;
  affiliation?: string | null;
  /** Marks a co-author who also fields correspondence. */
  isCorresponding?: boolean;
}

/**
 * Shows an author's name, email and registered institution on hover.
 *
 * Deliberately absent from the reviewer portal: peer review here is blind, and
 * a reviewer who could hover an author's name would learn exactly what the
 * process is designed to withhold.
 *
 * Focusable and described by the card, so the details are reachable by keyboard
 * and to a screen reader rather than being mouse-only.
 */
export function AuthorHover({
  author,
  children,
}: {
  author?: HoverAuthor | null;
  children?: ReactNode;
}) {
  const label = children ?? author?.name ?? author?.email ?? "—";
  // With nothing beyond the name to reveal, a hover card would be an empty box.
  if (!author || (!author.email && !author.affiliation)) return <>{label}</>;

  return (
    <span className="jida-author-hover" tabIndex={0}>
      <span className="jida-author-hover-name">{label}</span>
      <span className="jida-author-card" role="tooltip">
        <strong>{author.name ?? author.email}</strong>
        {author.email && (
          <a href={`mailto:${author.email}`} className="jida-author-card-email">
            {author.email}
          </a>
        )}
        <span className="jida-author-card-affiliation">
          {author.affiliation?.trim() || "No institution on file"}
        </span>
        {author.isCorresponding && (
          <span className="jida-badge info">Corresponding author</span>
        )}
      </span>
    </span>
  );
}

/** Co-author names, each with a hover card, separated by commas. */
function CoAuthorLine({ coAuthors }: { coAuthors: CoAuthor[] }) {
  return (
    <>
      {coAuthors.map((c, i) => (
        <Fragment key={`${c.email}-${i}`}>
          {i > 0 && ", "}
          <AuthorHover
            author={{
              name: c.fullName,
              email: c.email,
              affiliation: c.affiliation,
              isCorresponding: c.isCorresponding,
            }}
          />
        </Fragment>
      ))}
    </>
  );
}

/**
 * A published article's byline — the submitting author followed by any
 * co-authors, each name carrying its own hover card.
 */
function PublicAuthorLine({
  author,
  coAuthors,
}: {
  author?: PublicAuthor | null;
  coAuthors?: PublicCoAuthor[];
}) {
  const entries = [
    ...(author
      ? [
          {
            key: "lead",
            name: [author.firstName, author.lastName].filter(Boolean).join(" "),
            hover: {
              name: [author.firstName, author.lastName].filter(Boolean).join(" ") || null,
              email: author.email,
              affiliation: author.affiliation,
              isCorresponding: true,
            } satisfies HoverAuthor,
          },
        ]
      : []),
    ...(coAuthors ?? []).map((c, i) => ({
      key: `co-${i}`,
      name: c.fullName,
      hover: {
        name: c.fullName,
        email: c.email,
        affiliation: c.affiliation,
        isCorresponding: c.isCorresponding,
      } satisfies HoverAuthor,
    })),
  ].filter((e) => e.name);

  if (entries.length === 0) return <>—</>;

  return (
    <>
      {entries.map((entry, i) => (
        <Fragment key={entry.key}>
          {i > 0 && ", "}
          <AuthorHover author={entry.hover}>{entry.name}</AuthorHover>
        </Fragment>
      ))}
    </>
  );
}

// ─── Completed review form, read-only ──────────────────────────────────────

/**
 * A submitted review form as the reviewer who wrote it and editors see it:
 * every section, including the ratings and the confidential comments. The
 * author's view is built separately and deliberately shows far less.
 */
function ReviewFormSummary({ review }: { review: ReviewFormResult }) {
  const rated = review.assessment.filter((a) => a.rating);
  return (
    <div className="jida-review-summary">
      <p className="jida-review-recommendation">
        <span className={badgeClass(review.recommendation)}>{review.recommendationLabel}</span>
      </p>

      {rated.length > 0 && (
        <dl className="jida-review-ratings">
          {rated.map((a) => (
            <div key={a.key}>
              <dt>{a.label}</dt>
              <dd className={`jida-rating-value ${a.rating!.toLowerCase()}`}>
                {statusLabel(a.rating!)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="jida-review-block">
        <h5>Comments and Suggestions to the Author(s)</h5>
        <p>{review.commentsToAuthor}</p>
        {review.specificSuggestions && <p>{review.specificSuggestions}</p>}
      </div>

      {review.commentsToEditor && (
        <div className="jida-review-block confidential">
          <h5>Confidential Comments <span className="jida-badge warning">Not shown to authors</span></h5>
          <p>{review.commentsToEditor}</p>
        </div>
      )}
    </div>
  );
}

// ─── Author's feedback on a reviewer ───────────────────────────────────────

/**
 * "Authors' Feedback of Reviewer's Work to JIDA" — the closing section of the
 * review form, and the only part of it the author fills in. Rated 1 (Poor) to
 * 5 (Excellent); editors read the result, the reviewer never does.
 */
function ReviewerFeedbackForm({
  review,
  onSaved,
}: {
  review: AuthorVisibleReview;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(review.feedback?.rating ?? 0);
  const [comment, setComment] = useState(review.feedback?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function save() {
    if (rating < 1) {
      setMsg("Choose a rating from 1 to 5.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await saveReviewerFeedback(review.reviewId, { rating, comment: comment.trim() || undefined });
      setMsg("Thank you — your feedback was sent to the editorial team.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save feedback");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="jida-feedback-toggle" onClick={() => setOpen(true)}>
        {review.feedback
          ? `Your rating of this review: ${review.feedback.rating}/5 — edit`
          : "Rate this reviewer's work"}
      </button>
    );
  }

  return (
    <div className="jida-feedback">
      <p className="jida-feedback-title">Your Feedback of the Reviewer&apos;s Work to JIDA</p>
      <div className="jida-feedback-scale" role="radiogroup" aria-label="Rating from poor to excellent">
        <span className="jida-feedback-anchor">Poor</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            className={`jida-feedback-dot${rating === n ? " active" : ""}`}
            onClick={() => setRating(n)}
          >
            {n}
          </button>
        ))}
        <span className="jida-feedback-anchor">Excellent</span>
      </div>
      <textarea
        rows={2}
        value={comment}
        placeholder="Specific evaluation of the reviewer's review result (optional)"
        onChange={(e) => setComment(e.target.value)}
      />
      {msg && <p className="jida-feedback-msg">{msg}</p>}
      <div className="jida-feedback-actions">
        <button type="button" className="jida-btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Submit feedback"}
        </button>
        <button type="button" className="jida-btn-secondary" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
}

// ─── AuthorWorkspace ───────────────────────────────────────────────────────

export function AuthorWorkspace() {
  const [manuscripts, setManuscripts] = useState<ManuscriptSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [reviseMsg, setReviseMsg] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [openForSubmissions, setOpenForSubmissions] = useState(true);
  const [submitTab, setSubmitTab] = useState<"details" | "coauthors">("details");
  const [coAuthors, setCoAuthors] = useState<CoAuthor[]>([]);
  const submitRef = useRef<HTMLFormElement>(null);
  const reviseRef = useRef<HTMLFormElement>(null);

  function addCoAuthor() {
    setCoAuthors((prev) => [
      ...prev,
      { fullName: "", email: "", affiliation: "", isCorresponding: false },
    ]);
  }

  function updateCoAuthor(index: number, patch: Partial<CoAuthor>) {
    setCoAuthors((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeCoAuthor(index: number) {
    setCoAuthors((prev) => prev.filter((_, i) => i !== index));
  }

  // FR-A12 — show the journal's manuscript submission deadline to authors.
  useEffect(() => {
    (async () => {
      try {
        const s = await getSubmissionSettings();
        setDeadline(s.submissionDeadline);
        setOpenForSubmissions(s.openForSubmissions);
      } catch {
        /* non-blocking */
      }
    })();
  }, []);

  async function fetchList(q?: string) {
    setLoadingList(true);
    setListError(null);
    try {
      setManuscripts(await getManuscripts(q || undefined));
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchList(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitMsg(null);
    const fd = new FormData(e.currentTarget);

    // Catch a half-filled co-author here rather than letting the server reject
    // the whole submission after the file has already uploaded.
    const partial = coAuthors.findIndex(
      (c) => (c.fullName.trim() ? 0 : 1) + (c.email.trim() ? 0 : 1) === 1,
    );
    if (partial !== -1) {
      setSubmitTab("coauthors");
      setSubmitMsg(`Co-author ${partial + 1} needs both a name and an email address.`);
      return;
    }

    try {
      const res = await submitManuscript(fd, coAuthors);
      setSubmitMsg(`Manuscript submitted — ID: ${res.id}`);
      submitRef.current?.reset();
      setCoAuthors([]);
      setSubmitTab("details");
      fetchList();
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : "Submission failed");
    }
  }

  async function handleRevision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReviseMsg(null);
    const fd = new FormData(e.currentTarget);
    const id = String(fd.get("manuscriptId") ?? "").trim();
    if (!id) { setReviseMsg("Enter a manuscript ID"); return; }
    try {
      await submitRevision(id, fd);
      setReviseMsg("Revision uploaded successfully.");
      reviseRef.current?.reset();
      fetchList();
    } catch (err) {
      setReviseMsg(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const publishedCount = manuscripts.filter((m) => m.status === "PUBLISHED").length;
  const revisionCount = manuscripts.filter((m) => m.status === "REVISION_REQUIRED").length;

  return (
    <section className="jida-workspace">
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Author Workspace</p>
          <h2>Manage submissions with confidence</h2>
          <p>Submit manuscripts, upload revisions, update your profile, and track publication progress.</p>
        </div>
      </div>

      <div className="jida-metrics">
        <article className="jida-metric"><p>Total Manuscripts</p><strong>{manuscripts.length}</strong></article>
        <article className="jida-metric"><p>Needs Revision</p><strong>{revisionCount}</strong></article>
        <article className="jida-metric"><p>Published</p><strong>{publishedCount}</strong></article>
      </div>

      {/* FR-A12 — submission deadline banner */}
      <div className="jida-card" style={{ padding: "0.85rem 1.1rem" }}>
        {!openForSubmissions ? (
          <p className="jida-badge danger">Submissions are currently closed.</p>
        ) : deadline ? (
          <p>
            <span className="jida-badge warning">Submission deadline</span>{" "}
            Manuscripts must be submitted by <strong>{deadline.slice(0, 10)}</strong>.
          </p>
        ) : (
          <p><span className="jida-badge success">Submissions open</span> No submission deadline is currently set.</p>
        )}
      </div>

      {activePanel === null && (
        <div className="jida-action-panels">
          <button type="button" className="jida-panel-card" onClick={() => setActivePanel("submit")}>
            <span className="jida-panel-num">01</span>
            <div className="jida-panel-info">
              <strong>Submit Manuscript</strong>
              <p>Provide core article details before editorial screening.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
          <button type="button" className="jida-panel-card" onClick={() => setActivePanel("revise")}>
            <span className="jida-panel-num">02</span>
            <div className="jida-panel-info">
              <strong>Upload Revision</strong>
              <p>Respond to reviewer feedback with a revised version.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
        </div>
      )}

      {activePanel === "submit" && (
        <div className="jida-form-panel">
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setSubmitMsg(null); }}>← Back to actions</button>
          <form className="jida-form" ref={submitRef} onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="jida-form-header">
              <span>01</span>
              <div><h3>Submit Manuscript</h3><p>Provide the core article details before editorial screening.</p></div>
            </div>
            {submitMsg && <p className={submitMsg.startsWith("Manuscript") ? "jida-badge success" : "jida-badge danger"}>{submitMsg}</p>}

            <div className="jida-form-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={submitTab === "details"}
                className={`jida-form-tab${submitTab === "details" ? " active" : ""}`}
                onClick={() => setSubmitTab("details")}
              >
                Manuscript Details
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={submitTab === "coauthors"}
                className={`jida-form-tab${submitTab === "coauthors" ? " active" : ""}`}
                onClick={() => setSubmitTab("coauthors")}
              >
                Co-Authors{coAuthors.length > 0 ? ` (${coAuthors.length})` : ""}
              </button>
            </div>

            {/* Both panes stay mounted: the fields are part of one form, and
                unmounting the hidden tab would drop what was typed there. */}
            <div hidden={submitTab !== "details"}>
              <label>Title<input name="title" placeholder="Enter manuscript title" required /></label>
              <label>Abstract<textarea name="abstract" placeholder="Briefly summarize the manuscript" rows={4} required /></label>
              <label>Keywords<input name="keywords" placeholder="Comma-separated keywords" /></label>
              <label>
                References <span className="jida-optional">(optional)</span>
                <textarea name="references" placeholder="Paste references or citation list" rows={3} />
              </label>
              <label>Manuscript file (PDF / DOCX)<input type="file" name="file" accept=".pdf,.docx" required /></label>
            </div>

            <div hidden={submitTab !== "coauthors"}>
              <p className="jida-form-hint">
                List any other authors on this manuscript. Tick “corresponding” for anyone who
                should also field correspondence about it.
              </p>

              {coAuthors.length === 0 && (
                <p className="jida-form-empty">No co-authors added — this is a single-author submission.</p>
              )}

              {coAuthors.map((co, i) => (
                <fieldset key={i} className="jida-coauthor">
                  <legend>Co-Author {i + 1}</legend>
                  <div className="jida-coauthor-grid">
                    <label>
                      Full name
                      <input
                        value={co.fullName}
                        onChange={(e) => updateCoAuthor(i, { fullName: e.target.value })}
                        placeholder="e.g. Alice Umutoni"
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={co.email}
                        onChange={(e) => updateCoAuthor(i, { email: e.target.value })}
                        placeholder="name@institution.ac.rw"
                      />
                    </label>
                    <label>
                      Affiliation <span className="jida-optional">(optional)</span>
                      <input
                        value={co.affiliation ?? ""}
                        onChange={(e) => updateCoAuthor(i, { affiliation: e.target.value })}
                        placeholder="Department, University, City, Country"
                      />
                    </label>
                  </div>
                  <div className="jida-coauthor-actions">
                    <label className="jida-checkbox">
                      <input
                        type="checkbox"
                        checked={co.isCorresponding ?? false}
                        onChange={(e) => updateCoAuthor(i, { isCorresponding: e.target.checked })}
                      />
                      Corresponding author
                    </label>
                    <button type="button" className="jida-btn-danger-sm" onClick={() => removeCoAuthor(i)}>
                      Remove
                    </button>
                  </div>
                </fieldset>
              ))}

              <button type="button" className="jida-btn-secondary" onClick={addCoAuthor}>
                + Add co-author
              </button>
            </div>

            <button type="submit" className="jida-btn-primary">Submit Manuscript</button>
          </form>
        </div>
      )}

      {activePanel === "revise" && (
        <div className="jida-form-panel">
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setReviseMsg(null); }}>← Back to actions</button>
          <form className="jida-form" ref={reviseRef} onSubmit={handleRevision} encType="multipart/form-data">
            <div className="jida-form-header">
              <span>02</span>
              <div><h3>Upload Revision</h3><p>Respond to reviewer feedback with a revised version.</p></div>
            </div>
            {reviseMsg && <p>{reviseMsg}</p>}
            <label>Manuscript ID<input name="manuscriptId" placeholder="Paste ID from table below" required /></label>
            <label>Revised file<input type="file" name="file" accept=".pdf,.docx" required /></label>
            <button type="submit" className="jida-btn-primary">Upload Revised Version</button>
          </form>
        </div>
      )}

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Tracking</p>
            <h2>Your Manuscripts</h2>
          </div>
          <span className="jida-badge">{manuscripts.length} records</span>
        </div>

        <div className="jida-toolbar">
          <input
            placeholder="Search manuscripts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loadingList ? (
          <p style={{ padding: "1rem" }}>Loading…</p>
        ) : listError ? (
          <p style={{ padding: "1rem", color: "red" }}>{listError}</p>
        ) : (
          /* One horizontal card per submission. */
          <div className="jida-track-list">
            {manuscripts.map((item) => {
              const latestFile = item.files?.[0];
              const editorFile = latestFile?.source === "EDITOR" ? latestFile : undefined;
              const submitted = (item.createdAt ?? item.submittedAt)?.slice(0, 10) ?? "—";
              return (
                <article key={item.id} className="jida-track-card">
                  <div className="jida-track-main">
                    <div className="jida-track-head">
                      <h3>{item.title}</h3>
                      <span className={badgeClass(item.status)}>{statusLabel(item.status)}</span>
                    </div>
                    <p className="jida-track-meta">
                      Submitted {submitted} · <code>{item.id}</code>
                    </p>
                    {item.coAuthors && item.coAuthors.length > 0 && (
                      <p className="jida-track-meta">
                        Co-authors: <CoAuthorLine coAuthors={item.coAuthors} />
                      </p>
                    )}

                    <div className="jida-track-comments">
                      <section>
                        <h4>Editor&apos;s Comments</h4>
                        {item.decisions && item.decisions.length > 0 ? (
                          item.decisions.map((d, i) => (
                            <div key={i} className="jida-track-note">
                              <span className={badgeClass(d.decision)}>{statusLabel(d.decision)}</span>{" "}
                              <span className="jida-track-date">{d.createdAt.slice(0, 10)}</span>
                              {d.notes && <p>{d.notes}</p>}
                            </div>
                          ))
                        ) : (
                          <p className="jida-track-muted">No decision recorded yet.</p>
                        )}
                      </section>

                      <section>
                        <h4>Reviewer Comments</h4>
                        {item.reviews && item.reviews.length > 0 ? (
                          item.reviews.map((r) => (
                            <div key={r.reviewId} className="jida-track-note">
                              <strong>{r.reviewerLabel}</strong>
                              <p>{r.commentsToAuthor}</p>
                              {r.specificSuggestions && (
                                <p className="jida-track-suggestions">{r.specificSuggestions}</p>
                              )}
                              <ReviewerFeedbackForm review={r} onSaved={() => fetchList(query)} />
                            </div>
                          ))
                        ) : (
                          <p className="jida-track-muted">
                            {item.status === "SUBMITTED" || item.status === "UNDER_REVIEW"
                              ? "Released once the editor reaches a decision."
                              : "No reviewer comments."}
                          </p>
                        )}
                      </section>
                    </div>
                  </div>

                  <aside className="jida-track-actions">
                    {editorFile && (
                      <>
                        <button
                          type="button"
                          className="jida-btn-secondary"
                          onClick={() =>
                            downloadFile(
                              `/api/manuscripts/${item.id}/files/${editorFile.id}/download`,
                              editorFile.originalName,
                            ).catch((e) => alert(e instanceof Error ? e.message : "Download failed"))
                          }
                        >
                          Editor&apos;s revision
                        </button>
                        {editorFile.remarks && (
                          <p className="jida-track-remarks">{editorFile.remarks}</p>
                        )}
                      </>
                    )}
                    {item.publication && (
                      <button
                        type="button"
                        className="jida-btn-primary"
                        onClick={() =>
                          downloadFile(
                            `/api/manuscripts/published/${item.publication!.slug}/download`,
                            `${item.title}.pdf`,
                          ).catch((e) => alert(e instanceof Error ? e.message : "Download failed"))
                        }
                      >
                        Published article
                      </button>
                    )}
                    {!editorFile && !item.publication && (
                      <p className="jida-track-muted">No files to download yet.</p>
                    )}
                  </aside>
                </article>
              );
            })}
            {manuscripts.length === 0 && (
              <p style={{ textAlign: "center", padding: "1rem" }}>No manuscripts found.</p>
            )}
          </div>
        )}
      </section>
    </section>
  );
}

// ─── ReviewerWorkspace ─────────────────────────────────────────────────────

export function ReviewerWorkspace() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [history, setHistory] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [presetAssignmentId, setPresetAssignmentId] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openPanel(panel: string, assignmentId: string) {
    setPresetAssignmentId(assignmentId);
    setActivePanel(panel);
  }

  const activeAssignment = assignments.find((a) => a.id === presetAssignmentId);

  useEffect(() => {
    (async () => {
      try {
        const [a, h] = await Promise.all([getAssignments(), getReviewHistory()]);
        setAssignments(a);
        setHistory(h);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleProgress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProgressMsg(null);
    const fd = new FormData(e.currentTarget);
    const id = String(fd.get("assignmentId") ?? "").trim();
    const progress = String(fd.get("progress") ?? "") as ReviewProgress;
    if (!id) { setProgressMsg("Select an assignment from the queue below"); return; }
    try {
      await updateReviewProgress(id, progress);
      setProgressMsg("Progress updated.");
      setAssignments(await getAssignments());
    } catch (err) {
      setProgressMsg(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReviewMsg(null);
    const fd = new FormData(e.currentTarget);
    const id = String(fd.get("assignmentId") ?? "").trim();
    if (!id) { setReviewMsg("Select an assignment from the queue below"); return; }

    // Every item in "Assessment of the article" must be rated — the form asks
    // the reviewer to score all seven.
    const missing = ASSESSMENT_ITEMS.filter((item) => !fd.get(item.key));
    if (missing.length) {
      setReviewMsg(
        `Rate every item in the assessment section — ${missing.length} still unrated.`,
      );
      return;
    }
    const recommendation = String(fd.get("recommendation") ?? "");
    if (!recommendation) {
      setReviewMsg("Choose an overall recommendation.");
      return;
    }

    const ratings = Object.fromEntries(
      ASSESSMENT_ITEMS.map((item) => [item.key, fd.get(item.key) as ReviewRating]),
    ) as Record<(typeof ASSESSMENT_ITEMS)[number]["key"], ReviewRating>;

    const file = fd.get("file");
    try {
      await submitReview(id, {
        ...ratings,
        recommendation: recommendation as ReviewRecommendation,
        commentsToAuthor: String(fd.get("commentsToAuthor") ?? ""),
        specificSuggestions: String(fd.get("specificSuggestions") ?? "") || undefined,
        commentsToEditor: String(fd.get("commentsToEditor") ?? "") || undefined,
        file: file instanceof File && file.size > 0 ? file : null,
      });
      setReviewMsg("Review submitted successfully.");
      const [a, h] = await Promise.all([getAssignments(), getReviewHistory()]);
      setAssignments(a);
      setHistory(h);
      setActivePanel(null);
    } catch (err) {
      setReviewMsg(err instanceof Error ? err.message : "Submission failed");
    }
  }

  const pendingCount = assignments.filter((a) => a.progress !== "FINISHED_REVIEW").length;
  const completedCount = assignments.filter((a) => a.progress === "FINISHED_REVIEW").length;

  return (
    <section className="jida-workspace">
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Reviewer Workspace</p>
          <h2>Review assignments with clarity</h2>
          <p>Track assigned manuscripts, submit structured evaluations, and update review progress.</p>
        </div>
      </div>

      <div className="jida-metrics">
        <article className="jida-metric"><p>Assigned Reviews</p><strong>{assignments.length}</strong></article>
        <article className="jida-metric"><p>Pending</p><strong>{pendingCount}</strong></article>
        <article className="jida-metric"><p>Completed</p><strong>{completedCount}</strong></article>
      </div>

      {loading && <p style={{ padding: "1rem" }}>Loading…</p>}
      {error && <p style={{ padding: "1rem", color: "red" }}>{error}</p>}

      {activePanel === null && (
        <div className="jida-action-panels">
          <button type="button" className="jida-panel-card" onClick={() => openPanel("review", assignments[0]?.id ?? "")}>
            <span className="jida-panel-num">01</span>
            <div className="jida-panel-info">
              <strong>Submit Review Evaluation</strong>
              <p>Provide structured feedback and a recommendation for the manuscript.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
          <button type="button" className="jida-panel-card" onClick={() => openPanel("progress", assignments[0]?.id ?? "")}>
            <span className="jida-panel-num">02</span>
            <div className="jida-panel-info">
              <strong>Update Review Progress</strong>
              <p>Track your progress on an assigned manuscript.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
        </div>
      )}

      {activePanel === "review" && (
        <div className="jida-form-panel">
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setReviewMsg(null); }}>← Back to actions</button>
          <form className="jida-form" onSubmit={handleReview} encType="multipart/form-data">
            <div className="jida-form-header">
              <span>01</span>
              <div>
                <h3>Manuscript Review Form</h3>
                <p>{activeAssignment?.manuscriptTitle ?? "Select a manuscript from the queue below"}</p>
              </div>
            </div>
            {reviewMsg && (
              <p className={reviewMsg.startsWith("Review submitted") ? "jida-badge success" : "jida-badge danger"}>
                {reviewMsg}
              </p>
            )}
            <input type="hidden" name="assignmentId" value={presetAssignmentId} />

            <p className="jida-form-hint">
              All material submitted to JIDA is confidential and must not be shared before
              publication. Tell the editor if you have any conflict of interest in reviewing this
              paper.
            </p>

            {/* 1 — Assessment of the article */}
            <fieldset className="jida-review-section">
              <legend>Assessment of the Article</legend>
              <p className="jida-form-hint">
                Rate the quality of the article on each aspect below.
              </p>
              <div className="jida-rating-table">
                <div className="jida-rating-head">
                  <span />
                  {REVIEW_RATINGS.map((r) => (
                    <span key={r} className="jida-rating-col">{statusLabel(r)}</span>
                  ))}
                </div>
                {ASSESSMENT_ITEMS.map((item) => (
                  <div key={item.key} className="jida-rating-row">
                    <span className="jida-rating-label">{item.label}</span>
                    {REVIEW_RATINGS.map((r) => (
                      <label key={r} className="jida-rating-cell">
                        <input type="radio" name={item.key} value={r} />
                        <span className="jida-rating-mobile">{statusLabel(r)}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </fieldset>

            {/* 2 — Overall recommendation */}
            <fieldset className="jida-review-section">
              <legend>Overall Recommendation</legend>
              <div className="jida-recommendation-list">
                {(Object.keys(RECOMMENDATION_LABELS) as ReviewRecommendation[]).map((key) => (
                  <label key={key} className="jida-radio-row">
                    <input type="radio" name="recommendation" value={key} />
                    {RECOMMENDATION_LABELS[key]}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* 3 — The only section the author is shown */}
            <fieldset className="jida-review-section">
              <legend>Comments and Suggestions to the Author(s)</legend>
              <p className="jida-form-hint">
                This section — and only this section — is shown to the author.
              </p>
              <label>
                Overall evaluation of the manuscript (100–200 words). For manuscripts that cannot
                be published, specify the inadequacies.
                <textarea name="commentsToAuthor" rows={5} required />
              </label>
              <label>
                Reasons for acceptance or rejection, and any suggestions for revision or
                improvement — title, abstract, literature review, methods, figures, tables,
                language, structure, innovation. <span className="jida-optional">(optional)</span>
                <textarea name="specificSuggestions" rows={5} />
              </label>
            </fieldset>

            {/* 4 — Editor-only */}
            <fieldset className="jida-review-section">
              <legend>Confidential Comments</legend>
              <p className="jida-form-hint">
                Nothing in this section is shown to the authors.
              </p>
              <label>
                Confidential comments to the editor <span className="jida-optional">(optional)</span>
                <textarea name="commentsToEditor" rows={3} />
              </label>
            </fieldset>

            <label>Annotated file <span className="jida-optional">(optional)</span><input type="file" name="file" accept=".pdf,.docx" /></label>
            <button type="submit" className="jida-btn-primary" disabled={!presetAssignmentId}>Submit Review</button>
          </form>
        </div>
      )}

      {activePanel === "progress" && (
        <div className="jida-form-panel">
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setProgressMsg(null); }}>← Back to actions</button>
          <form className="jida-form" onSubmit={handleProgress}>
            <div className="jida-form-header">
              <span>02</span>
              <div><h3>Update Review Progress</h3><p>{activeAssignment?.manuscriptTitle ?? "Select a manuscript from the queue below"}</p></div>
            </div>
            {progressMsg && <p>{progressMsg}</p>}
            <input type="hidden" name="assignmentId" value={presetAssignmentId} />
            <label>
              Progress
              <select name="progress" defaultValue="">
                <option value="" disabled>Select progress</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="BEGIN_REVIEW">Begin Review</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FINISHED_REVIEW">Finished Review</option>
              </select>
            </label>
            <button type="submit" className="jida-btn-primary" disabled={!presetAssignmentId}>Update Progress</button>
          </form>
        </div>
      )}

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Assignments</p>
            <h2>Review Queue</h2>
            <p className="jida-section-note">Most recently submitted manuscripts first.</p>
          </div>
          <span className="jida-badge">{assignments.length} manuscripts</span>
        </div>
        <div className="jida-table-wrap">
          <table className="jida-table">
            <thead>
              <tr>
                <th>Manuscript</th>
                <th>Submitted</th>
                <th>Deadline</th>
                <th>Progress</th>
                <th>Recommendation</th>
                <th>File</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <Fragment key={a.id}>
                  <tr>
                    <td data-label="Manuscript">
                      <button
                        type="button"
                        className="jida-btn-secondary"
                        style={{ padding: 0, border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
                        onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      >
                        <strong>{a.manuscriptTitle ?? "Untitled manuscript"}</strong>
                      </button>
                    </td>
                    <td data-label="Submitted">{a.submittedAt?.slice(0, 10) ?? "—"}</td>
                    <td data-label="Deadline">{a.deadline?.slice(0, 10)}</td>
                    <td data-label="Progress"><span className={badgeClass(a.progress)}>{statusLabel(a.progress)}</span></td>
                    <td data-label="Recommendation">
                      <span className={badgeClass(a.recommendation ?? "pending")}>
                        {a.recommendation ? statusLabel(a.recommendation) : "Pending"}
                      </span>
                    </td>
                    <td data-label="File">
                      {/* FR-R3 — download assigned manuscript */}
                      <button
                        type="button"
                        className="jida-badge info"
                        style={{ cursor: "pointer", border: "none" }}
                        onClick={() =>
                          downloadFile(
                            `/api/reviewer/assignments/${a.id}/download`,
                            `${a.manuscriptTitle ?? "manuscript"}.pdf`,
                          ).catch((e) => alert(e instanceof Error ? e.message : "Download failed"))
                        }
                      >
                        Download
                      </button>
                    </td>
                    <td data-label="Actions">
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <button type="button" className="jida-badge" style={{ cursor: "pointer", border: "none" }} onClick={() => openPanel("review", a.id)}>Review</button>
                        <button type="button" className="jida-badge" style={{ cursor: "pointer", border: "none" }} onClick={() => openPanel("progress", a.id)}>Progress</button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === a.id && (
                    <tr>
                      <td colSpan={7} style={{ background: "var(--jida-surface-alt, rgba(0,0,0,0.03))" }}>
                        <p style={{ margin: "0.5rem 0" }}><strong>Abstract:</strong> {a.abstract || "—"}</p>
                        <p style={{ margin: "0.5rem 0" }}><strong>Keywords:</strong> {a.keywords?.length ? a.keywords.join(", ") : "—"}</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {assignments.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "1rem" }}>No assignments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {history.length > 0 && (
        <section className="jida-card">
          <div className="jida-section-heading">
            <div><p className="jida-section-kicker">History</p><h2>Past Reviews</h2></div>
            <span className="jida-badge">{history.length}</span>
          </div>
          <div className="jida-track-list">
            {history.map((h) => (
              <article key={h.id} className="jida-track-card">
                <div className="jida-track-main">
                  <div className="jida-track-head">
                    <h3>{h.manuscriptTitle ?? "Untitled manuscript"}</h3>
                    {h.review && (
                      <span className="jida-track-date">{h.review.createdAt.slice(0, 10)}</span>
                    )}
                  </div>
                  {h.review ? (
                    <ReviewFormSummary review={h.review} />
                  ) : (
                    <p className="jida-track-muted">No form on file for this review.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

// ─── EditorWorkspace ───────────────────────────────────────────────────────

export function EditorWorkspace() {
  const [submissions, setSubmissions] = useState<EditorSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);
  const [decisionMsg, setDecisionMsg] = useState<string | null>(null);
  const [issueMsg, setIssueMsg] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [reviewers, setReviewers] = useState<ReviewerOption[]>([]);
  const [presetManuscriptId, setPresetManuscriptId] = useState<string>("");
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [unassigning, setUnassigning] = useState<string | null>(null);
  /** What stands between the article just published and Google Scholar. */
  const [scholarReport, setScholarReport] = useState<ScholarReadiness | null>(null);

  function openPanel(panel: string, manuscriptId: string) {
    setPresetManuscriptId(manuscriptId);
    setActivePanel(panel);
  }

  // FR-E3 — load available reviewers for assignment.
  useEffect(() => {
    (async () => {
      try {
        setReviewers(await getReviewers());
      } catch {
        /* non-blocking */
      }
    })();
  }, []);

  async function fetchSubmissions() {
    setLoading(true);
    setError(null);
    try {
      setSubmissions(await getEditorSubmissions());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSubmissions(); }, []);

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAssignMsg(null);
    const fd = new FormData(e.currentTarget);
    const manuscriptId = String(fd.get("manuscriptId") ?? "").trim();
    const reviewerId = String(fd.get("reviewerId") ?? "").trim();
    const deadline = String(fd.get("deadline") ?? "").trim();
    if (!manuscriptId || !reviewerId || !deadline) { setAssignMsg("All fields required"); return; }
    try {
      await assignReviewers(manuscriptId, [{ reviewerId, deadline }]);
      setAssignMsg("Reviewer assigned successfully.");
      fetchSubmissions();
    } catch (err) {
      setAssignMsg(err instanceof Error ? err.message : "Assignment failed");
    }
  }

  async function handleDecision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDecisionMsg(null);
    const fd = new FormData(e.currentTarget);
    const manuscriptId = String(fd.get("manuscriptId") ?? "").trim();
    const decision = String(fd.get("decision") ?? "") as "ACCEPT" | "REJECT" | "REQUEST_REVISION";
    const notes = String(fd.get("notes") ?? "").trim();
    if (!manuscriptId || !decision) { setDecisionMsg("All fields required"); return; }
    try {
      await makeDecision(manuscriptId, decision, notes || undefined);
      setDecisionMsg("Decision recorded.");
      fetchSubmissions();
    } catch (err) {
      setDecisionMsg(err instanceof Error ? err.message : "Decision failed");
    }
  }

  async function handlePublish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIssueMsg(null);
    setScholarReport(null);
    const fd = new FormData(e.currentTarget);
    const volume = Number(fd.get("volume"));
    const issue = Number(fd.get("issueNum"));
    const year = Number(fd.get("year"));
    const manuscriptId = String(fd.get("manuscriptId") ?? "").trim();
    const scholar = fd.get("scholar") === "on";
    try {
      const { id: issueId } = await createIssue({ volume, issue, year });
      const publication = await publishToIssue(issueId, manuscriptId);

      if (!scholar || !publication?.id) {
        setIssueMsg("Manuscript published to issue.");
        fetchSubmissions();
        return;
      }

      // FR-E12 — expose the published work to Google Scholar indexing. The
      // article is already published either way; only the indexing flag can
      // fail, and when it does the editor needs to see exactly why.
      try {
        const result = await setScholarReady(publication.id, true);
        setIssueMsg("Manuscript published and marked for Google Scholar indexing.");
        setScholarReport(result.warnings?.length ? result : null);
      } catch (scholarErr) {
        // The 400 body carries the blockers; ApiError keeps it on `details`.
        const readiness =
          scholarErr instanceof ApiError
            ? (scholarErr.details as unknown as ScholarReadiness | undefined)
            : undefined;
        setIssueMsg(
          "Manuscript published, but it is not yet ready for Google Scholar indexing.",
        );
        setScholarReport(
          readiness?.blockers ? readiness : {
            ready: false,
            blockers: [
              {
                id: "unknown",
                severity: "blocker",
                message:
                  scholarErr instanceof Error ? scholarErr.message : "Scholar check failed",
              },
            ],
            warnings: [],
          },
        );
      }
      fetchSubmissions();
    } catch (err) {
      setIssueMsg(err instanceof Error ? err.message : "Publish failed");
    }
  }

  async function handleUnassign(manuscriptId: string, reviewerId: string) {
    if (!confirm("Unassign this reviewer?")) return;
    setUnassigning(reviewerId);
    try {
      await unassignReviewer(manuscriptId, reviewerId);
      fetchSubmissions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unassign failed");
    } finally {
      setUnassigning(null);
    }
  }

  async function handleUploadEditedFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadMsg(null);
    const fd = new FormData(e.currentTarget);
    const manuscriptId = String(fd.get("manuscriptId") ?? "").trim();
    if (!manuscriptId) { setUploadMsg("Select a manuscript"); return; }
    try {
      await uploadEditedFile(manuscriptId, fd);
      setUploadMsg("Edited manuscript uploaded — the author has been notified.");
      fetchSubmissions();
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const unassignedCount = submissions.filter((s) => !s.assignments || s.assignments.length === 0).length;
  const decisionPendingCount = submissions.filter((s) => s.status === "UNDER_REVIEW" || s.status === "REVISION_REQUIRED").length;

  return (
    <section className="jida-workspace">
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Editor Workspace</p>
          <h2>Coordinate editorial decisions</h2>
          <p>Assign reviewers, record decisions, and publish accepted manuscripts.</p>
        </div>
      </div>

      <div className="jida-metrics">
        <article className="jida-metric"><p>Total Submissions</p><strong>{submissions.length}</strong></article>
        <article className="jida-metric"><p>Unassigned</p><strong>{unassignedCount}</strong></article>
        <article className="jida-metric"><p>Pending Decisions</p><strong>{decisionPendingCount}</strong></article>
      </div>

      {loading && <p style={{ padding: "1rem" }}>Loading…</p>}
      {error && <p style={{ padding: "1rem", color: "red" }}>{error}</p>}

      {activePanel === null && (
        <div className="jida-action-panels">
          <button type="button" className="jida-panel-card" onClick={() => openPanel("assign", "")}>
            <span className="jida-panel-num">01</span>
            <div className="jida-panel-info">
              <strong>Assign Reviewer</strong>
              <p>Link a reviewer to a manuscript with a deadline.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
          <button type="button" className="jida-panel-card" onClick={() => openPanel("decision", "")}>
            <span className="jida-panel-num">02</span>
            <div className="jida-panel-info">
              <strong>Editorial Decision</strong>
              <p>Accept, reject, or request revision on a submission.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
          <button type="button" className="jida-panel-card" onClick={() => openPanel("publish", "")}>
            <span className="jida-panel-num">03</span>
            <div className="jida-panel-info">
              <strong>Publish to Issue</strong>
              <p>Create an issue and publish an accepted manuscript.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
          <button type="button" className="jida-panel-card" onClick={() => openPanel("upload", "")}>
            <span className="jida-panel-num">04</span>
            <div className="jida-panel-info">
              <strong>Upload Edited Manuscript</strong>
              <p>Send back a revised file with remarks for the author.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
        </div>
      )}

      {activePanel === "assign" && (
        <div className="jida-form-panel">
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setAssignMsg(null); }}>← Back to actions</button>
          <form className="jida-form" onSubmit={handleAssign}>
            <div className="jida-form-header">
              <span>01</span>
              <div><h3>Assign Reviewer</h3><p>Link a reviewer to a manuscript with a deadline.</p></div>
            </div>
            {assignMsg && <p>{assignMsg}</p>}
            <label>
              Manuscript
              <select name="manuscriptId" defaultValue={presetManuscriptId} required>
                <option value="" disabled>Select a manuscript</option>
                {submissions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title} — {statusLabel(s.status)}</option>
                ))}
              </select>
            </label>
            <label>
              Reviewer
              {reviewers.length > 0 ? (
                <select name="reviewerId" defaultValue="" required>
                  <option value="" disabled>Select a reviewer</option>
                  {reviewers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {[r.firstName, r.lastName].filter(Boolean).join(" ") || r.email} — {r.email}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="reviewerId" placeholder="Reviewer account ID" required />
              )}
            </label>
            <label>Deadline<input type="date" name="deadline" required /></label>
            <button type="submit" className="jida-btn-primary">Assign Reviewer</button>
          </form>
        </div>
      )}

      {activePanel === "decision" && (
        <div className="jida-form-panel">
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setDecisionMsg(null); }}>← Back to actions</button>
          <form className="jida-form" onSubmit={handleDecision}>
            <div className="jida-form-header">
              <span>02</span>
              <div><h3>Editorial Decision</h3><p>Accept, reject, or request revision.</p></div>
            </div>
            {decisionMsg && <p>{decisionMsg}</p>}
            <label>
              Manuscript
              <select name="manuscriptId" defaultValue={presetManuscriptId} required>
                <option value="" disabled>Select a manuscript</option>
                {submissions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title} — {statusLabel(s.status)}</option>
                ))}
              </select>
            </label>
            <label>
              Decision
              <select name="decision" defaultValue="">
                <option value="" disabled>Select decision</option>
                <option value="ACCEPT">Accept</option>
                <option value="REJECT">Reject</option>
                <option value="REQUEST_REVISION">Request Revision</option>
              </select>
            </label>
            <label>Comments (visible to the author and other editors)<textarea name="notes" rows={3} placeholder="Explain the reasoning behind this decision" /></label>
            <button type="submit" className="jida-btn-primary">Record Decision</button>
          </form>
        </div>
      )}

      {activePanel === "publish" && (
        <div className="jida-form-panel">
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setIssueMsg(null); }}>← Back to actions</button>
          <form className="jida-form" onSubmit={handlePublish}>
            <div className="jida-form-header">
              <span>03</span>
              <div><h3>Publish to Issue</h3><p>Create an issue and publish an accepted manuscript.</p></div>
            </div>
            {issueMsg && <p>{issueMsg}</p>}

            {/* What Google Scholar needs before it will index the article. */}
            {scholarReport && (
              <div
                className={`jida-scholar-report${scholarReport.ready ? " ready" : ""}`}
                role="status"
              >
                <p className="jida-scholar-report-title">
                  {scholarReport.ready
                    ? "Indexed for Google Scholar, with recommendations"
                    : "Not yet ready for Google Scholar"}
                </p>
                {scholarReport.blockers.length > 0 && (
                  <>
                    <h5>Must be fixed before indexing</h5>
                    <ul>
                      {scholarReport.blockers.map((c) => (
                        <li key={c.id} className="blocker">{c.message}</li>
                      ))}
                    </ul>
                  </>
                )}
                {scholarReport.warnings.length > 0 && (
                  <>
                    <h5>Recommended</h5>
                    <ul>
                      {scholarReport.warnings.map((c) => (
                        <li key={c.id} className="warning">{c.message}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            <label>
              Manuscript
              <select name="manuscriptId" defaultValue={presetManuscriptId} required>
                <option value="" disabled>Select an accepted manuscript</option>
                {submissions.filter((s) => s.status === "ACCEPTED").map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </label>
            <label>Volume<input type="number" name="volume" placeholder="e.g. 12" min={1} required /></label>
            <label>Issue number<input type="number" name="issueNum" placeholder="e.g. 2" min={1} required /></label>
            <label>Year<input type="number" name="year" defaultValue={new Date().getFullYear()} min={2000} required /></label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" name="scholar" defaultChecked style={{ width: "auto" }} />
              Publish to Google Scholar (adds citation metadata for indexing)
            </label>
            <button type="submit" className="jida-btn-primary">Publish to Journal Issue</button>
          </form>
        </div>
      )}

      {activePanel === "upload" && (
        <div className="jida-form-panel">
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setUploadMsg(null); }}>← Back to actions</button>
          <form className="jida-form" onSubmit={handleUploadEditedFile} encType="multipart/form-data">
            <div className="jida-form-header">
              <span>04</span>
              <div><h3>Upload Edited Manuscript</h3><p>Send back a revised file with remarks for the author.</p></div>
            </div>
            {uploadMsg && <p>{uploadMsg}</p>}
            <label>
              Manuscript
              <select name="manuscriptId" defaultValue={presetManuscriptId} required>
                <option value="" disabled>Select a manuscript</option>
                {submissions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title} — {statusLabel(s.status)}</option>
                ))}
              </select>
            </label>
            <label>Edited file (PDF / DOCX)<input type="file" name="file" accept=".pdf,.docx" required /></label>
            <label>Remarks for the author<textarea name="remarks" rows={3} placeholder="Explain what was changed" required /></label>
            <button type="submit" className="jida-btn-primary">Upload Edited Manuscript</button>
          </form>
        </div>
      )}

      <section className="jida-card">
        <div className="jida-section-heading">
          <div><p className="jida-section-kicker">Submissions</p><h2>Editorial Pipeline</h2></div>
          <span className="jida-badge">{submissions.length} submissions</span>
        </div>
        {/* One horizontal card per submission. */}
        <div className="jida-track-list">
          {submissions.map((s) => {
            const assignments = s.assignments ?? [];
            const submittedReviews = assignments.filter((a) => a.review);
            return (
              <article key={s.id} className="jida-track-card">
                <div className="jida-track-main">
                  <div className="jida-track-head">
                    <h3>{s.title}</h3>
                    <span className={badgeClass(s.status)}>{statusLabel(s.status)}</span>
                  </div>
                  <p className="jida-track-meta">
                    <AuthorHover
                      author={
                        s.author ?? (s.authorName ? { name: s.authorName } : null)
                      }
                    >
                      {s.authorName ?? "—"}
                    </AuthorHover>
                    {s.submittedAt ? ` · submitted ${s.submittedAt.slice(0, 10)}` : ""} ·{" "}
                    <code>{s.id}</code>
                  </p>
                  {s.coAuthors && s.coAuthors.length > 0 && (
                    <p className="jida-track-meta">
                      Co-authors: <CoAuthorLine coAuthors={s.coAuthors} />
                    </p>
                  )}

                  <div className="jida-track-comments">
                    <section>
                      <h4>Reviewers</h4>
                      {assignments.length > 0 ? (
                        assignments.map((a) => (
                          <div key={a.id} className="jida-reviewer-row">
                            <span>{a.reviewer?.name ?? a.reviewer?.email ?? "assigned"}</span>
                            <span className={badgeClass(a.recommendation ?? "pending")}>
                              {a.recommendation ? statusLabel(a.recommendation) : "Pending"}
                            </span>
                            {a.hasAttachment && a.reviewId && (
                              <button
                                type="button"
                                className="jida-badge info"
                                style={{ cursor: "pointer", border: "none" }}
                                onClick={() =>
                                  downloadFile(
                                    `/api/editor/reviews/${a.reviewId}/download`,
                                    `${s.title} — reviewer file`,
                                  ).catch((e) => alert(e instanceof Error ? e.message : "Download failed"))
                                }
                              >
                                File
                              </button>
                            )}
                            {!a.recommendation && a.reviewer?.id && (
                              <button
                                type="button"
                                className="jida-btn-danger-sm"
                                disabled={unassigning === a.reviewer.id}
                                onClick={() => handleUnassign(s.id, a.reviewer!.id)}
                              >
                                {unassigning === a.reviewer.id ? "…" : "Unassign"}
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="jida-badge warning">Unassigned</span>
                      )}
                    </section>

                    <section>
                      <h4>Editor&apos;s Comments</h4>
                      {s.decisions && s.decisions.length > 0 ? (
                        s.decisions.map((d, i) => (
                          <div key={i} className="jida-track-note">
                            <span className={badgeClass(d.decision)}>{statusLabel(d.decision)}</span>{" "}
                            <span className="jida-track-date">
                              {d.editorName} · {d.createdAt.slice(0, 10)}
                            </span>
                            {d.notes && <p>{d.notes}</p>}
                          </div>
                        ))
                      ) : (
                        <p className="jida-track-muted">No decision recorded yet.</p>
                      )}
                    </section>
                  </div>

                  {/* Completed review forms in full — the editor sees every
                      section, including the confidential comments. */}
                  {submittedReviews.length > 0 && (
                    <div className="jida-review-forms">
                      <h4>Submitted Review Forms</h4>
                      {submittedReviews.map((a) => (
                        <details key={a.id} className="jida-review-details">
                          <summary>
                            {a.reviewer?.name ?? a.reviewer?.email ?? "Reviewer"}
                            {a.reviewedAt ? ` · ${a.reviewedAt.slice(0, 10)}` : ""}
                            {a.authorFeedback ? ` · author rated ${a.authorFeedback.rating}/5` : ""}
                          </summary>
                          <ReviewFormSummary review={a.review!} />
                          {a.authorFeedback && (
                            <div className="jida-review-block">
                              <h5>Author&apos;s Feedback of the Reviewer&apos;s Work</h5>
                              <p>
                                Rating: <strong>{a.authorFeedback.rating}/5</strong>
                                {a.authorFeedback.comment ? ` — ${a.authorFeedback.comment}` : ""}
                              </p>
                            </div>
                          )}
                        </details>
                      ))}
                    </div>
                  )}
                </div>

                <aside className="jida-track-actions">
                  <button
                    type="button"
                    className="jida-btn-secondary"
                    onClick={() =>
                      downloadFile(`/api/editor/manuscripts/${s.id}/download`, `${s.title}.pdf`)
                        .catch((e) => alert(e instanceof Error ? e.message : "Download failed"))
                    }
                  >
                    Download
                  </button>
                  <button type="button" className="jida-btn-secondary" onClick={() => openPanel("assign", s.id)}>Assign</button>
                  <button type="button" className="jida-btn-secondary" onClick={() => openPanel("decision", s.id)}>Decide</button>
                  <button type="button" className="jida-btn-secondary" onClick={() => openPanel("upload", s.id)}>Upload</button>
                </aside>
              </article>
            );
          })}
          {submissions.length === 0 && !loading && (
            <p style={{ textAlign: "center", padding: "1rem" }}>No submissions found.</p>
          )}
        </div>
      </section>
    </section>
  );
}

// ─── ArchiveWorkspace ──────────────────────────────────────────────────────

export function ArchiveWorkspace() {
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [query, setQuery] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const skipInitialSearch = useRef(true);

  // Read ?q=, ?keyword= and ?year= from the URL — the homepage search and the
  // advanced search page both hand off here. Client-side only so this stays
  // a plain component (no Suspense boundary for useSearchParams).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const kw = params.get("keyword");
    const year = params.get("year");
    if (q) setQuery(q);
    if (kw) setKeyword(kw);
    if (year && !Number.isNaN(Number(year))) setSelectedYear(Number(year));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [i, a] = await Promise.all([getPublicIssues(), getPublicArticles()]);
        setIssues(i);
        setArticles(a);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (skipInitialSearch.current) {
      skipInitialSearch.current = false;
      return;
    }
    const t = setTimeout(async () => {
      try {
        setArticles(await getPublicArticles(query || undefined, keyword || undefined));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [query, keyword]);

  // Facet counts, ScienceDirect-style: how many articles carry each subject,
  // and how many issues fall in each year — computed from what's loaded so
  // the sidebar narrows as filters are applied.
  const subjectCounts = new Map<string, number>();
  for (const article of articles) {
    for (const subject of article.manuscript.keywords ?? []) {
      subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1);
    }
  }
  const subjects = Array.from(subjectCounts.keys()).sort((a, b) => a.localeCompare(b));

  const yearCounts = new Map<number, number>();
  for (const issue of issues) {
    yearCounts.set(issue.year, (yearCounts.get(issue.year) ?? 0) + 1);
  }
  const years = Array.from(yearCounts.keys()).sort((a, b) => b - a);

  const visibleIssues = selectedYear ? issues.filter((issue) => issue.year === selectedYear) : issues;

  // Group issues under a year heading, newest year first, mirroring how
  // ScienceDirect's "Volumes and issues" page is organized.
  const issuesByYear = new Map<number, PublicIssue[]>();
  for (const issue of visibleIssues) {
    const bucket = issuesByYear.get(issue.year) ?? [];
    bucket.push(issue);
    issuesByYear.set(issue.year, bucket);
  }
  const orderedYears = Array.from(issuesByYear.keys()).sort((a, b) => b - a);

  const hasActiveFilters = query || keyword || selectedYear;

  return (
    <section className="jida-workspace">
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Public Archive</p>
          <h2>Discover published research</h2>
          <p>Browse journal issues and search published articles from the JIDA digital archive.</p>
        </div>
      </div>

      {loading && <p style={{ padding: "1rem" }}>Loading…</p>}
      {error && <p style={{ padding: "1rem", color: "red" }}>{error}</p>}

      <div className="jida-archive-layout">
        <aside className="jida-archive-sidebar" aria-label="Refine results">
          {hasActiveFilters && (
            <button
              type="button"
              className="jida-filter-clear"
              onClick={() => {
                setQuery("");
                setKeyword("");
                setSelectedYear(null);
              }}
            >
              Clear all filters
            </button>
          )}

          <div className="jida-archive-facet-group">
            <h3>Browse by year</h3>
            <ul className="jida-archive-facet-list">
              <li>
                <button
                  type="button"
                  className={`jida-archive-facet-item${selectedYear === null ? " active" : ""}`}
                  onClick={() => setSelectedYear(null)}
                >
                  <span>All years</span>
                  <span className="jida-archive-facet-count">{issues.length}</span>
                </button>
              </li>
              {years.map((year) => (
                <li key={year}>
                  <button
                    type="button"
                    className={`jida-archive-facet-item${selectedYear === year ? " active" : ""}`}
                    onClick={() => setSelectedYear((current) => (current === year ? null : year))}
                  >
                    <span>{year}</span>
                    <span className="jida-archive-facet-count">{yearCounts.get(year)}</span>
                  </button>
                </li>
              ))}
              {years.length === 0 && <li className="jida-archive-facet-empty">No issues yet</li>}
            </ul>
          </div>

          <div className="jida-archive-facet-group">
            <h3>Browse by subject</h3>
            <ul className="jida-archive-facet-list">
              <li>
                <button
                  type="button"
                  className={`jida-archive-facet-item${keyword === "" ? " active" : ""}`}
                  onClick={() => setKeyword("")}
                >
                  <span>All subjects</span>
                  <span className="jida-archive-facet-count">{articles.length}</span>
                </button>
              </li>
              {subjects.map((subject) => (
                <li key={subject}>
                  <button
                    type="button"
                    className={`jida-archive-facet-item${keyword === subject ? " active" : ""}`}
                    onClick={() => setKeyword((current) => (current === subject ? "" : subject))}
                  >
                    <span>{subject}</span>
                    <span className="jida-archive-facet-count">{subjectCounts.get(subject)}</span>
                  </button>
                </li>
              ))}
              {subjects.length === 0 && <li className="jida-archive-facet-empty">No subjects yet</li>}
            </ul>
          </div>
        </aside>

        {/* Issues, grouped by year and each listing everything published in it. */}
        <div className="jida-archive-main">
          <section className="jida-card">
            <div className="jida-section-heading">
              <div><p className="jida-section-kicker">Issues</p><h2>Journal Issues</h2></div>
              <span className="jida-badge info">{visibleIssues.length} issues</span>
            </div>

            {orderedYears.map((year) => (
              <div key={year} className="jida-archive-year-group">
                <h3 className="jida-archive-year-heading">{year}</h3>
                <div className="jida-issue-list">
                  {(issuesByYear.get(year) ?? []).map((issue) => {
                    const count = issueArticleCount(issue);
                    return (
                      <article key={issue.id} className="jida-issue-card">
                        <header className="jida-issue-card-head">
                          <div>
                            <h3>{formatIssueTitle(issue)}</h3>
                            {issue.title && <p className="jida-issue-subtitle">{issue.title}</p>}
                            <p className="jida-issue-meta">
                              {count} article{count === 1 ? "" : "s"}
                            </p>
                          </div>
                        </header>

                        {issue.publications && issue.publications.length > 0 ? (
                          <ol className="jida-issue-contents">
                            {issue.publications.map((pub) => (
                              <li key={pub.id}>
                                <Link href={`/archive/${pub.slug}`} className="jida-issue-article-title">
                                  {pub.manuscript.title}
                                </Link>
                                <span className="jida-issue-article-authors">
                                  <PublicAuthorLine
                                    author={pub.manuscript.author}
                                    coAuthors={pub.manuscript.coAuthors}
                                  />
                                </span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="jida-issue-empty">No articles in this issue yet.</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
            {visibleIssues.length === 0 && !loading && (
              <p style={{ padding: "1rem" }}>No issues published yet.</p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

// ─── AdvancedSearchWorkspace ───────────────────────────────────────────────

type AdvancedSearchField = "any" | "title" | "author" | "abstract" | "keyword";

const ADVANCED_SEARCH_FIELDS: { value: AdvancedSearchField; label: string }[] = [
  { value: "any", label: "Anywhere" },
  { value: "title", label: "Article title" },
  { value: "author", label: "Author" },
  { value: "abstract", label: "Abstract" },
  { value: "keyword", label: "Keywords" },
];

interface AdvancedSearchRow {
  id: string;
  connector: "AND" | "OR" | "NOT";
  field: AdvancedSearchField;
  term: string;
}

let advancedSearchRowSeq = 0;
function newAdvancedSearchRow(): AdvancedSearchRow {
  advancedSearchRowSeq += 1;
  return { id: `row-${advancedSearchRowSeq}`, connector: "AND", field: "any", term: "" };
}

const MAX_ADVANCED_SEARCH_ROWS = 5;

export function AdvancedSearchWorkspace() {
  const router = useRouter();
  const [rows, setRows] = useState<AdvancedSearchRow[]>(() => [newAdvancedSearchRow()]);
  const [year, setYear] = useState("");
  const [years, setYears] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getPublicIssues()
      .then((issues) => {
        setYears(Array.from(new Set(issues.map((i) => i.year))).sort((a, b) => b - a));
      })
      .catch(() => {
        /* Year filter is a nicety — leave it empty if issues can't load. */
      });
  }, []);

  function updateRow(id: string, patch: Partial<AdvancedSearchRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) =>
      current.length < MAX_ADVANCED_SEARCH_ROWS ? [...current, newAdvancedSearchRow()] : current,
    );
  }

  function removeRow(id: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  }

  function resetForm() {
    setRows([newAdvancedSearchRow()]);
    setYear("");
    setFormError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const filled = rows.filter((row) => row.term.trim());
    if (filled.length === 0 && !year) {
      setFormError("Enter at least one search term, or choose a publication year.");
      return;
    }
    setFormError(null);

    // The API only understands a free-text query plus one keyword filter —
    // richer than that, so terms scoped to "Keywords" become the keyword
    // filter and everything else is folded into the free-text query. Boolean
    // connectors shape how the terms read here but degrade to a single
    // combined query, since there's no boolean search on the backend.
    const keywordRow = filled.find((row) => row.field === "keyword");
    const queryTerms = filled.filter((row) => row.field !== "keyword").map((row) => row.term.trim());

    const params = new URLSearchParams();
    if (queryTerms.length > 0) params.set("q", queryTerms.join(" "));
    if (keywordRow) params.set("keyword", keywordRow.term.trim());
    if (year) params.set("year", year);

    router.push(`/archive${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <section className="jida-workspace">
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Public Archive</p>
          <h2>Advanced Search</h2>
          <p>
            Combine multiple search terms and filters to find exactly what you&apos;re
            looking for in the JIDA digital archive.
          </p>
        </div>
      </div>

      <form className="jida-card jida-advsearch" onSubmit={handleSubmit}>
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Search terms</p>
            <h2>Find articles</h2>
          </div>
        </div>

        <div className="jida-advsearch-rows">
          {rows.map((row, index) => (
            <div className="jida-advsearch-row" key={row.id}>
              <div className="jida-advsearch-connector">
                {index === 0 ? (
                  <span>Search for</span>
                ) : (
                  <select
                    aria-label="Combine with"
                    value={row.connector}
                    onChange={(e) => updateRow(row.id, { connector: e.target.value as AdvancedSearchRow["connector"] })}
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                    <option value="NOT">NOT</option>
                  </select>
                )}
              </div>

              <input
                type="text"
                className="jida-advsearch-term"
                aria-label="Search term"
                placeholder="e.g. sociolinguistics, Kayigema, teaching methods…"
                value={row.term}
                onChange={(e) => updateRow(row.id, { term: e.target.value })}
              />

              <select
                className="jida-advsearch-field"
                aria-label="Search in"
                value={row.field}
                onChange={(e) => updateRow(row.id, { field: e.target.value as AdvancedSearchField })}
              >
                {ADVANCED_SEARCH_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="jida-advsearch-remove"
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                aria-label="Remove search term"
                title="Remove search term"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="jida-advanced-toggle jida-advsearch-addrow"
          onClick={addRow}
          disabled={rows.length >= MAX_ADVANCED_SEARCH_ROWS}
        >
          + Add another search term
        </button>

        <div className="jida-advsearch-filters">
          <p className="jida-section-kicker">Refine by</p>
          <div className="jida-advsearch-filter-row">
            <label htmlFor="advsearch-year">Publication year</label>
            <select id="advsearch-year" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Any year</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formError && <p className="jida-advsearch-error" role="alert">{formError}</p>}

        <div className="jida-advsearch-actions">
          <button type="submit" className="jida-btn-primary">
            Search
          </button>
          <button type="button" className="jida-advsearch-reset" onClick={resetForm}>
            Reset form
          </button>
        </div>
      </form>
    </section>
  );
}

export function ReviewArticleButton({ slug }: { slug: string }) {
  return (
    <button
      type="button"
      className="jida-btn-primary"
      onClick={() =>
        viewFile(`/api/public/articles/${slug}/download`).catch((e) =>
          alert(e instanceof Error ? e.message : "Failed to open article"),
        )
      }
    >
      Review article
    </button>
  );
}

// ─── AdminWorkspace ────────────────────────────────────────────────────────

type AdminTab = "users" | "author" | "reviewer" | "editor";

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "users",    label: "User Management" },
  { id: "author",   label: "Author Tasks" },
  { id: "reviewer", label: "Reviewer Tasks" },
  { id: "editor",   label: "Editor Tasks" },
];

const ROLE_BADGE: Record<UserRole, string> = {
  AUTHOR:           "jida-badge info",
  REVIEWER:         "jida-badge success",
  EDITOR:           "jida-badge warning",
  ADMIN:            "jida-badge danger",
  CHIEF_EDITOR:     "jida-badge warning",
  ASSOCIATE_EDITOR: "jida-badge warning",
};

/** Roles an admin can grant, in the order they appear on the create form. */
const ASSIGNABLE_ROLES: UserRole[] = [
  "AUTHOR",
  "REVIEWER",
  "EDITOR",
  "CHIEF_EDITOR",
  "ASSOCIATE_EDITOR",
  "ADMIN",
];

/** Inline editor for an existing account's roles. */
function RoleEditor({ user, onSaved }: { user: AdminUser; onSaved: () => void }) {
  const held = user.roles?.length ? user.roles : [user.role];
  const [open, setOpen] = useState(false);
  const [primary, setPrimary] = useState<UserRole>(user.role);
  const [selected, setSelected] = useState<UserRole[]>(held);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(role: UserRole) {
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await adminUpdateUserRoles(user.id, {
        role: primary,
        roles: [...new Set<UserRole>([primary, ...selected])],
      });
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update roles");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="jida-btn-secondary" onClick={() => setOpen(true)}>
        Edit roles
      </button>
    );
  }

  return (
    <div className="jida-role-editor">
      <label>
        Primary
        <select value={primary} onChange={(e) => setPrimary(e.target.value as UserRole)}>
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </label>
      <div className="jida-role-checkboxes">
        {ASSIGNABLE_ROLES.map((r) => (
          <label key={r} className="jida-checkbox">
            <input
              type="checkbox"
              checked={selected.includes(r) || r === primary}
              disabled={r === primary}
              onChange={() => toggle(r)}
            />
            {ROLE_LABELS[r]}
          </label>
        ))}
      </div>
      {error && <p className="jida-feedback-msg">{error}</p>}
      <div className="jida-feedback-actions">
        <button type="button" className="jida-btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save roles"}
        </button>
        <button type="button" className="jida-btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AdminWorkspace() {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError]     = useState<string | null>(null);
  const [createMsg, setCreateMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [creating, setCreating]   = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const createRef = useRef<HTMLFormElement>(null);

  async function fetchUsers() {
    setUsersLoading(true);
    setUsersError(null);
    try {
      setUsers(await adminGetUsers());
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
  }, [activeTab]);

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    const fd = new FormData(e.currentTarget);
    const primary = String(fd.get("role") ?? "AUTHOR") as UserRole;
    // The primary role decides the landing portal; the checkboxes add any
    // further roles the account should hold.
    const extra = fd.getAll("extraRoles").map(String) as UserRole[];
    const roles = [...new Set<UserRole>([primary, ...extra])];
    try {
      const created = await adminCreateUser({
        email:       String(fd.get("email") ?? ""),
        password:    String(fd.get("password") ?? ""),
        role:        primary,
        roles,
        name:        String(fd.get("name") ?? "") || undefined,
        institution: String(fd.get("institution") ?? "") || undefined,
      });
      setCreateMsg({
        ok: true,
        text: `User "${created.email}" created with ${(created.roles ?? [created.role])
          .map((r) => ROLE_LABELS[r])
          .join(", ")}.`,
      });
      createRef.current?.reset();
      fetchUsers();
    } catch (err) {
      setCreateMsg({ ok: false, text: err instanceof Error ? err.message : "Creation failed" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Remove user "${email}"? This cannot be undone.`)) return;
    setDeleting(userId);
    try {
      await adminDeleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      {/* ── Admin tab bar ─────────────────────────────────────── */}
      <div className="jida-admin-tabbar">
        <span className="jida-admin-tabbar-label">Admin</span>
        <nav className="jida-admin-tabs">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`jida-admin-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── User Management ───────────────────────────────────── */}
      {activeTab === "users" && (
        <section className="jida-workspace">
          <div className="jida-page-title">
            <div>
              <p className="jida-section-kicker">Admin · User Management</p>
              <h2>Manage system users</h2>
              <p>Create author, reviewer, or editor accounts and manage all registered users.</p>
            </div>
          </div>

          <div className="jida-metrics">
            <article className="jida-metric">
              <p>Total Users</p>
              <strong>{users.length}</strong>
            </article>
            <article className="jida-metric">
              <p>Authors</p>
              <strong>{users.filter((u) => u.role === "AUTHOR").length}</strong>
            </article>
            <article className="jida-metric">
              <p>Reviewers</p>
              <strong>{users.filter((u) => u.role === "REVIEWER").length}</strong>
            </article>
          </div>

          {/* Create user form */}
          <section className="jida-card">
            <div className="jida-section-heading">
              <div>
                <p className="jida-section-kicker">New Account</p>
                <h2>Create User</h2>
              </div>
            </div>

            <form className="jida-admin-create-form" ref={createRef} onSubmit={handleCreateUser}>
              {createMsg && (
                <p className={createMsg.ok ? "jida-badge success" : "jida-badge danger"} style={{ padding: "0.55rem 0.8rem", borderRadius: "8px", display: "block" }}>
                  {createMsg.text}
                </p>
              )}

              <div className="jida-admin-create-grid">
                <label>
                  Full Name
                  <input name="name" type="text" placeholder="e.g. Alice Umutoni" />
                </label>
                <label>
                  Email <span className="jida-required">*</span>
                  <input name="email" type="email" placeholder="user@example.com" required />
                </label>
                <label>
                  Password <span className="jida-required">*</span>
                  <input name="password" type="password" placeholder="Minimum 8 characters" minLength={8} required />
                </label>
                <label>
                  Primary Role <span className="jida-required">*</span>
                  <select name="role" defaultValue="AUTHOR" required>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Institution
                  <input name="institution" type="text" placeholder="University or affiliation" />
                </label>
              </div>

              <fieldset className="jida-review-section">
                <legend>Additional Roles</legend>
                <p className="jida-form-hint">
                  An account can hold several roles. A chief editor already carries editor,
                  reviewer and author rights, so there is no need to tick those.
                </p>
                <div className="jida-role-checkboxes">
                  {ASSIGNABLE_ROLES.filter((r) => r !== "ADMIN").map((r) => (
                    <label key={r} className="jida-checkbox">
                      <input type="checkbox" name="extraRoles" value={r} />
                      {ROLE_LABELS[r]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <button type="submit" className="jida-btn-primary" disabled={creating}>
                {creating ? "Creating…" : "Create User"}
              </button>
            </form>
          </section>

          {/* Users table */}
          <section className="jida-card">
            <div className="jida-section-heading">
              <div>
                <p className="jida-section-kicker">Directory</p>
                <h2>All Users</h2>
              </div>
              <span className="jida-badge">{users.length} accounts</span>
            </div>

            {usersLoading ? (
              <p style={{ padding: "1rem" }}>Loading…</p>
            ) : usersError ? (
              <p style={{ padding: "1rem", color: "red" }}>{usersError}</p>
            ) : (
              <div className="jida-table-wrap">
                <table className="jida-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Institution</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        {/* Plain text: the directory already shows the email and
                            institution in their own columns, so a hover card here
                            would only obscure the name it covers. */}
                        <td data-label="Name">{u.name ?? "—"}</td>
                        <td data-label="Email">{u.email}</td>
                        <td data-label="Roles">
                          <div className="jida-role-badges">
                            {(u.roles?.length ? u.roles : [u.role]).map((r) => (
                              <span key={r} className={ROLE_BADGE[r]}>{ROLE_LABELS[r]}</span>
                            ))}
                          </div>
                        </td>
                        <td data-label="Institution">{u.institution ?? "—"}</td>
                        <td data-label="Joined">{u.createdAt?.slice(0, 10) ?? "—"}</td>
                        <td data-label="Actions">
                          <div className="jida-admin-row-actions">
                            <RoleEditor user={u} onSaved={fetchUsers} />
                            <button
                              type="button"
                              className="jida-btn-danger-sm"
                              disabled={deleting === u.id}
                              onClick={() => handleDelete(u.id, u.email)}
                            >
                              {deleting === u.id ? "…" : "Remove"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "1rem" }}>
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      )}

      {activeTab === "author"   && <AuthorWorkspace />}
      {activeTab === "reviewer" && <ReviewerWorkspace />}
      {activeTab === "editor"   && <EditorWorkspace />}
    </>
  );
}
