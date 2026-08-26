"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, X, User, Plus, Minus, Search, Quote, Link2, Check, ChevronDown } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  postAnnouncement,
  getNotifications,
  deleteNotification,
  getPublicIssues,
  getPublicArticles,
  adminGetUsers,
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUserRoles,
  adminSetUserStatus,
  adminGetSettings,
  adminUpdateSettings,
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
  type AdminSettings,
  type UserRole,
  type Role,
  type ReviewerOption,
  type DecisionStage,
  type NotificationItem,
} from "@/lib/api";
import {
  canAccessRole,
  clearSession,
  dashboardByRole,
  readRole,
  readRoles,
  readToken,
} from "@/lib/session";
import { splitReferences } from "@/lib/references";
import {
  DashboardSidebar,
  TeamRoster,
  ReminderButton,
  NotificationBell,
  StatCard,
  ActivityTimeline,
  ActionModal,
  type DashboardView,
  type TeamPerson,
  type ActivityEvent,
} from "@/features/jida/dashboard-shell";

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

/** "+3 this week" from a list of ISO timestamps, or undefined if none fall in the last 7 days. */
function weeklyTrend(timestamps: (string | undefined)[]): string | undefined {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const count = timestamps.filter((iso) => !!iso && new Date(iso).getTime() >= weekAgo).length;
  return count > 0 ? `+${count} this week` : undefined;
}

/** Escapes regex-special characters so a raw search string can be used inside a RegExp literally. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps every match of `query` inside `text` in a gold highlight — used to
 * show which part of a title matched a live search. `text.split()` with a
 * single capturing group alternates [before, match, between, match, …], so
 * odd indices are always the captured matches. */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "i"));
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="jida-search-highlight">{part}</mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** "Jun 3, 2026, 12:00 PM" — a date with a time-of-day, for editor's
 * comments and decision notes where knowing just the day isn't enough. */
function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** Result message for an action form — colored and glowing green on
 * success, red otherwise. `isSuccess` decides which; pass the raw message
 * string, not a pre-formatted one. */
function ActionResultMessage({ message, isSuccess }: { message: string; isSuccess: boolean }) {
  return (
    <p className={`jida-result-msg ${isSuccess ? "success" : "danger"}`}>{message}</p>
  );
}

// ─── ProfileModal ──────────────────────────────────────────────────────────

function ProfileModal({ onClose }: { onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ email: string; name: string; institution: string } | null>(null);
  // Portal target isn't available during SSR — only render into document.body
  // once mounted client-side (matches the sidebar's logout modal).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  if (!mounted) return null;

  return createPortal(
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
    </div>,
    document.body,
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

/** "Alice Umutoni" → "AU"; a single word or bare email falls back to its
 * first two characters. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** The public nav's "About" item — a dropdown onto the four sections of the
 * standalone /about page, closing on an outside click or an item pick. */
function AboutMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const items: { href: string; label: string }[] = [
    { href: "/about#about-jida", label: "About JIDA" },
    { href: "/about#why-publish", label: "Why Publish with JIDA" },
    { href: "/about#guidelines", label: "Guidelines to Publish with JIDA" },
    { href: "/about#editorial-board", label: "Editorial Board" },
  ];

  return (
    <div className="jida-about-menu" ref={ref}>
      <button
        type="button"
        className="jida-about-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        About <ChevronDown size={14} className={open ? "jida-about-chevron open" : "jida-about-chevron"} />
      </button>
      {open && (
        <div className="jida-about-dropdown" role="menu">
          {items.map((item) => (
            <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    setUserRole(readRole());
    setUserRoles(readRoles());
    setIsLoggedIn(!!readToken());
  }, [pathname]);

  // Only known once fetched — session storage carries the role/token but not
  // the account's display name, and the header chip needs both.
  useEffect(() => {
    if (!isLoggedIn) { setAccount(null); return; }
    getMe()
      .then((me) => setAccount({ name: me.name || me.email, email: me.email }))
      .catch(() => {});
  }, [isLoggedIn]);

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
          <img src="/images/auca_logo.png" alt="AUCA logo" className="jida-header-logo" />
          <span className="jida-header-name">Journal of Inter-Discourse Academia</span>
        </Link>

        {isPublicPage ? (
          <nav className="jida-header-nav jida-header-nav-public">
            <AboutMenu />
            <Link href="/#jida-articles-section">Articles &amp; Publication</Link>

            {!isLoggedIn && (
              <span className="jida-auth-group" aria-label="Account access">
                <Link href="/login" className="jida-auth-group-login">Login</Link>
                <Link href="/signup" className="jida-auth-group-register">Register</Link>
              </span>
            )}

            {isLoggedIn && (
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
          </nav>
        ) : (
          <div className="jida-header-right">
            {isLoggedIn && roleLabel && (
              <span className="jida-role-badge">{roleLabel}</span>
            )}

            {/* Role switcher — how a chief editor reaches the reviewer and
                author portals their role grants them. A dropdown rather than a
                row of buttons since it's a single choice among several. */}
            {showSwitcher && (
              <select
                className="jida-role-select"
                aria-label="Switch portal"
                value={availablePortals.find((p) => pathname.startsWith(p.href))?.href ?? availablePortals[0].href}
                onChange={(e) => router.push(e.target.value)}
              >
                {availablePortals.map((portal) => (
                  <option key={portal.href} value={portal.href}>{portal.label}</option>
                ))}
              </select>
            )}

            <nav className="jida-header-nav">
              {isLoggedIn && (
                <>
                  <NotificationBell />
                  {account && (
                    <button
                      type="button"
                      className="jida-account-chip"
                      onClick={() => setShowProfile(true)}
                      title="Profile settings"
                    >
                      <span className="jida-account-avatar">{initialsOf(account.name)}</span>
                      <span className="jida-account-text">
                        <strong>{account.name}</strong>
                        <span>{account.email}</span>
                      </span>
                    </button>
                  )}
                </>
              )}
            </nav>
          </div>
        )}
      </header>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
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

  // Two or more authors get an ampersand before the last name, not another
  // comma — "Smith, Doe & Lee" rather than "Smith, Doe, Lee".
  return (
    <>
      {entries.map((entry, i) => (
        <Fragment key={entry.key}>
          {i > 0 && (i === entries.length - 1 ? " & " : ", ")}
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

// ─── ReferencesPreview ─────────────────────────────────────────────────────

/**
 * Live preview under the References field: however messy the pasted block
 * is — numbered or not, one per line or run together with a source
 * document's original wraps — this shows the author what the system
 * actually parsed it into, numbered and alphabetized, so a badly-split
 * entry is visible before submission rather than after.
 */
function ReferencesPreview({ raw }: { raw: string }) {
  if (!raw.trim()) return null;
  const entries = splitReferences(raw);
  if (entries.length === 0) return null;

  return (
    <div className="jida-references-preview">
      <p className="jida-references-preview-count">
        {entries.length} {entries.length === 1 ? "reference" : "references"} detected
        {entries.length > 1 ? ", alphabetized" : ""}
      </p>
      <ol className="jida-reference-list">
        {entries.map((entry, i) => (
          <li key={i}>
            <p>{entry}</p>
          </li>
        ))}
      </ol>
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
  const [referencesText, setReferencesText] = useState("");
  const submitRef = useRef<HTMLFormElement>(null);

  const [activeView, setActiveView] = useState<DashboardView>("dashboard");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"" | "az" | "za">("");
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const reviseInlineRef = useRef<HTMLFormElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);

  // Bring a newly-opened form into view instead of leaving the user to
  // scroll and find it — panels swap in place, but a long tracking table
  // can put the new form well below the fold.
  useEffect(() => {
    if (activePanel || revisingId) {
      formPanelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }, [activePanel, revisingId]);

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

    // Only the name is required — catch a blank one here rather than letting
    // the server reject the whole submission after the file has already
    // uploaded.
    const missingName = coAuthors.findIndex((c) => !c.fullName.trim());
    if (missingName !== -1) {
      setSubmitTab("coauthors");
      setSubmitMsg(`Co-author ${missingName + 1} needs a name.`);
      return;
    }

    try {
      const res = await submitManuscript(fd, coAuthors);
      setSubmitMsg(`Manuscript submitted — ID: ${res.id}`);
      submitRef.current?.reset();
      setCoAuthors([]);
      setReferencesText("");
      setSubmitTab("details");
      fetchList();
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : "Submission failed");
    }
  }

  async function handleRevision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReviseMsg(null);
    if (!revisingId) return;
    const fd = new FormData(e.currentTarget);
    try {
      await submitRevision(revisingId, fd);
      setReviseMsg("Revision uploaded successfully — this replaces the manuscript's revision-required status.");
      reviseInlineRef.current?.reset();
      setRevisingId(null);
      fetchList();
    } catch (err) {
      setReviseMsg(err instanceof Error ? err.message : "Upload failed");
    }
  }

  // Published isn't a status stored on the manuscript itself — it's whatever
  // has a Publication row.
  const publishedCount = manuscripts.filter((m) => m.publication).length;
  const revisionCount = manuscripts.filter((m) => m.status === "REVISION_REQUIRED").length;
  const manuscriptTrend = weeklyTrend(manuscripts.map((m) => m.submittedAt ?? m.createdAt));
  const authorActivity: ActivityEvent[] = [...manuscripts]
    .sort((a, b) => new Date(b.submittedAt ?? b.createdAt ?? 0).getTime() - new Date(a.submittedAt ?? a.createdAt ?? 0).getTime())
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      title: statusLabel(m.status),
      detail: `${m.title}${m.submittedAt || m.createdAt ? " · " + formatDateTime(m.submittedAt ?? m.createdAt!) : ""}`,
    }));

  const AUTHOR_STATUS_ORDER = ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUIRED", "ACCEPTED", "REJECTED", "PUBLISHED"];
  const statusFiltered =
    statusFilter === "PUBLISHED"
      ? manuscripts.filter((m) => m.publication)
      : statusFilter
        ? manuscripts.filter((m) => m.status === statusFilter)
        : manuscripts;
  const filteredManuscripts = sortOrder
    ? statusFiltered
        .slice()
        .sort((a, b) => (sortOrder === "az" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)))
    : statusFiltered;

  /** Groups a manuscript list by the submission deadline in effect when each
   * one came in — most recent period first, with anything from before this
   * field existed collected in one trailing group. */
  function groupBySubmissionPeriod(list: ManuscriptSummary[]) {
    const groups = new Map<string, ManuscriptSummary[]>();
    for (const m of list) {
      const key = m.submissionDeadline ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
    return [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : b.localeCompare(a)));
  }

  /** One manuscript's tracking card — shared by the Dashboard preview and the
   * full Tasks view so the two never drift out of sync. */
  function renderManuscript(item: ManuscriptSummary) {
    const latestFile = item.files?.[0];
    const editorFile = latestFile?.source === "EDITOR" ? latestFile : undefined;
    const submitted = (item.createdAt ?? item.submittedAt)?.slice(0, 10) ?? "—";
    return (
      <article key={item.id} className="jida-track-card">
        <div className="jida-track-main">
          <div className="jida-track-head">
            <h3><HighlightMatch text={item.title} query={query} /></h3>
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
                    <span className="jida-track-date">{formatDateTime(d.createdAt)}</span>
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
          <ReminderButton manuscriptId={item.id} />
          {item.status === "REVISION_REQUIRED" && (
            <button type="button" className="jida-btn-primary" onClick={() => { setRevisingId(item.id); setReviseMsg(null); }}>
              Upload Revision
            </button>
          )}
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

        {revisingId === item.id && (
          <div className="jida-form-panel jida-track-revise-panel" ref={formPanelRef}>
            {reviseMsg && (
              <ActionResultMessage message={reviseMsg} isSuccess={reviseMsg.startsWith("Revision uploaded")} />
            )}
            <form className="jida-form" ref={reviseInlineRef} onSubmit={handleRevision} encType="multipart/form-data">
              <label>Revised file<input type="file" name="file" accept=".pdf,.docx" required /></label>
              <div className="jida-form-actions-row">
                <button type="submit" className="jida-btn-primary">Upload Revised Version</button>
                <button type="button" className="jida-btn-secondary" onClick={() => { setRevisingId(null); setReviseMsg(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="jida-dash-layout">
      <DashboardSidebar role="AUTHOR" active={activeView} onNavigate={setActiveView} showTeam={false} />
      <div className="jida-dash-content">
    <section className="jida-workspace">
      {activeView === "dashboard" && (
      <>
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Author Workspace</p>
          <h2>Manage submissions with confidence</h2>
          <p>Submit manuscripts, upload revisions, update your profile, and track publication progress.</p>
        </div>
      </div>

      <div className="jida-stat-cards">
        <StatCard
          label="Total Manuscripts"
          value={manuscripts.length}
          trend={manuscriptTrend}
          onClick={() => { setStatusFilter(""); setActiveView("tasks"); }}
        />
        <StatCard
          label="Needs Revision"
          value={revisionCount}
          onClick={() => { setStatusFilter("REVISION_REQUIRED"); setActiveView("tasks"); }}
        />
        <StatCard
          label="Published"
          value={publishedCount}
          onClick={() => { setStatusFilter("PUBLISHED"); setActiveView("tasks"); }}
        />
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
        </div>
      )}

      {activePanel === "submit" && (
        <div className="jida-form-panel" ref={formPanelRef}>
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setSubmitMsg(null); }}>← Back to actions</button>
          <form className="jida-form" ref={submitRef} onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="jida-form-header">
              <span>01</span>
              <div><h3>Submit Manuscript</h3><p>Provide the core article details before editorial screening.</p></div>
            </div>
            {submitMsg && (
              <ActionResultMessage message={submitMsg} isSuccess={submitMsg.startsWith("Manuscript")} />
            )}

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
                <textarea
                  name="references"
                  placeholder="Paste references or citation list — any format. Numbered, one per line, or pasted straight from a document all work."
                  rows={4}
                  value={referencesText}
                  onChange={(e) => setReferencesText(e.target.value)}
                />
              </label>
              <ReferencesPreview raw={referencesText} />
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
                      Email <span className="jida-optional">(optional)</span>
                      <input
                        type="email"
                        value={co.email ?? ""}
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

      <div className="jida-grid-two">
      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Tracking</p>
            <h2>Your Manuscripts</h2>
          </div>
          <span className="jida-badge">{manuscripts.length} records</span>
        </div>

        {loadingList ? (
          <p style={{ padding: "1rem" }}>Loading…</p>
        ) : listError ? (
          <p style={{ padding: "1rem", color: "red" }}>{listError}</p>
        ) : (
          <>
            <div className="jida-track-list">
              {manuscripts.slice(0, 3).map(renderManuscript)}
              {manuscripts.length === 0 && (
                <p style={{ textAlign: "center", padding: "1rem" }}>No manuscripts found.</p>
              )}
            </div>
            {manuscripts.length > 3 && (
              <div className="jida-preview-footer">
                <button type="button" onClick={() => setActiveView("tasks")}>
                  See all {manuscripts.length} manuscripts →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Activity</p>
            <h2>Submission Timeline</h2>
          </div>
        </div>
        <ActivityTimeline items={authorActivity} emptyLabel="No activity yet." />
      </section>
      </div>
      </>
      )}

      {activeView === "tasks" && (
        <section className="jida-card">
          <div className="jida-section-heading">
            <div>
              <p className="jida-section-kicker">Tracking</p>
              <h2>Your Manuscripts</h2>
            </div>
            <span className="jida-badge">{filteredManuscripts.length} records</span>
          </div>

          <div className="jida-toolbar">
            <input
              placeholder="Search manuscripts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {AUTHOR_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}>
              <option value="">Sort by title</option>
              <option value="az">Title A → Z</option>
              <option value="za">Title Z → A</option>
            </select>
          </div>

          {loadingList ? (
            <p style={{ padding: "1rem" }}>Loading…</p>
          ) : listError ? (
            <p style={{ padding: "1rem", color: "red" }}>{listError}</p>
          ) : filteredManuscripts.length === 0 ? (
            <p style={{ textAlign: "center", padding: "1rem" }}>No manuscripts found.</p>
          ) : (
            groupBySubmissionPeriod(filteredManuscripts).map(([period, group]) => (
              <div key={period || "none"} className="jida-period-group">
                <p className="jida-period-group-label">
                  {period ? `Submission period ending ${period.slice(0, 10)}` : "No submission period recorded"}
                </p>
                <div className="jida-track-list">{group.map(renderManuscript)}</div>
              </div>
            ))
          )}
        </section>
      )}
    </section>
      </div>
    </div>
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

  const [activeView, setActiveView] = useState<DashboardView>("dashboard");
  const [query, setQuery] = useState("");
  const [progressFilter, setProgressFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"" | "az" | "za">("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historySortOrder, setHistorySortOrder] = useState<"" | "az" | "za">("");
  const formPanelRef = useRef<HTMLDivElement>(null);

  function openPanel(panel: string, assignmentId: string) {
    setPresetAssignmentId(assignmentId);
    setActivePanel(panel);
  }

  // Bring a newly-opened form into view instead of leaving the reviewer to
  // scroll and find it — panels swap in place, but a long queue table can
  // put the new form well below the fold.
  useEffect(() => {
    if (activePanel) formPanelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [activePanel]);

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
  const reviewerTrend = weeklyTrend(assignments.map((a) => a.submittedAt));
  const reviewerActivity: ActivityEvent[] = [
    ...history.map((h) => ({
      id: `h-${h.id}`,
      title: "Review submitted",
      detail: `${h.manuscriptTitle ?? "Manuscript"}${h.reviewedAt ? " · " + formatDateTime(h.reviewedAt) : ""}`,
      sortKey: h.reviewedAt ?? "",
    })),
    ...assignments
      .filter((a) => a.progress !== "FINISHED_REVIEW")
      .map((a) => ({
        id: `a-${a.id}`,
        title: statusLabel(a.progress),
        detail: `${a.manuscriptTitle ?? "Manuscript"}${a.submittedAt ? " · " + formatDateTime(a.submittedAt) : ""}`,
        sortKey: a.submittedAt ?? "",
      })),
  ]
    .sort((x, y) => new Date(y.sortKey || 0).getTime() - new Date(x.sortKey || 0).getTime())
    .slice(0, 5)
    .map(({ id, title, detail }) => ({ id, title, detail }));

  const REVIEWER_PROGRESS_ORDER: ReviewProgress[] = ["NOT_STARTED", "BEGIN_REVIEW", "IN_PROGRESS", "FINISHED_REVIEW"];

  const progressFilteredAssignments = assignments.filter((a) => {
    if (progressFilter === "PENDING") return a.progress !== "FINISHED_REVIEW";
    if (progressFilter && progressFilter !== "PENDING" && a.progress !== progressFilter) return false;
    if (query && !(a.manuscriptTitle ?? "").toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const filteredAssignments = sortOrder
    ? progressFilteredAssignments
        .slice()
        .sort((a, b) => {
          const at = a.manuscriptTitle ?? "";
          const bt = b.manuscriptTitle ?? "";
          return sortOrder === "az" ? at.localeCompare(bt) : bt.localeCompare(at);
        })
    : progressFilteredAssignments;

  /** Groups assignments by the submission deadline in effect when each
   * manuscript came in — most recent period first, with anything from
   * before this field existed collected in one trailing group. */
  function groupBySubmissionPeriod(list: Assignment[]) {
    const groups = new Map<string, Assignment[]>();
    for (const a of list) {
      const key = a.submissionDeadline ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    return [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : b.localeCompare(a)));
  }

  const filteredHistory = history.filter(
    (h) => !historyQuery || (h.manuscriptTitle ?? "").toLowerCase().includes(historyQuery.toLowerCase()),
  );
  const sortedHistory = historySortOrder
    ? filteredHistory
        .slice()
        .sort((a, b) => {
          const at = a.manuscriptTitle ?? "";
          const bt = b.manuscriptTitle ?? "";
          return historySortOrder === "az" ? at.localeCompare(bt) : bt.localeCompare(at);
        })
    : filteredHistory;

  /** One row of the Review Queue table (plus its expandable detail row) —
   * shared by the Dashboard preview and the full Tasks view. */
  function renderAssignmentRow(a: Assignment) {
    return (
      <Fragment key={a.id}>
        <tr>
          <td data-label="Manuscript">
            <button
              type="button"
              className="jida-btn-secondary"
              style={{ padding: 0, border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
              onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
            >
              <strong><HighlightMatch text={a.manuscriptTitle ?? "Untitled manuscript"} query={query} /></strong>
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
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className="jida-badge" style={{ cursor: "pointer", border: "none" }} onClick={() => openPanel("review", a.id)}>Review</button>
              <button type="button" className="jida-badge" style={{ cursor: "pointer", border: "none" }} onClick={() => openPanel("progress", a.id)}>Progress</button>
              <ReminderButton manuscriptId={a.manuscriptId} />
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
    );
  }

  return (
    <div className="jida-dash-layout">
      <DashboardSidebar role="REVIEWER" active={activeView} onNavigate={setActiveView} showTeam={false} showHistory={true} />
      <div className="jida-dash-content">
    <section className="jida-workspace">
      {activeView === "dashboard" && (
      <>
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Reviewer Workspace</p>
          <h2>Review assignments with clarity</h2>
          <p>Track assigned manuscripts, submit structured evaluations, and update review progress.</p>
        </div>
      </div>

      <div className="jida-stat-cards">
        <StatCard
          label="Assigned Reviews"
          value={assignments.length}
          trend={reviewerTrend}
          onClick={() => { setProgressFilter(""); setActiveView("tasks"); }}
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          onClick={() => { setProgressFilter("PENDING"); setActiveView("tasks"); }}
        />
        <StatCard
          label="Completed"
          value={completedCount}
          onClick={() => { setProgressFilter("FINISHED_REVIEW"); setActiveView("tasks"); }}
        />
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
        <ActionModal
          title="Confidential Blind Review"
          onClose={() => { setActivePanel(null); setReviewMsg(null); }}
        >
          <form className="jida-form" onSubmit={handleReview} encType="multipart/form-data">
            <div className="jida-form-header">
              <span>01</span>
              <div>
                <h3>Manuscript Review Form</h3>
                <p>{activeAssignment?.manuscriptTitle ?? "Select a manuscript from the queue below"}</p>
              </div>
            </div>
            {reviewMsg && (
              <ActionResultMessage message={reviewMsg} isSuccess={reviewMsg.startsWith("Review submitted")} />
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
            <fieldset className="jida-review-section jida-justified">
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
        </ActionModal>
      )}

      {activePanel === "progress" && (
        <div className="jida-form-panel" ref={formPanelRef}>
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setProgressMsg(null); }}>← Back to actions</button>
          <form className="jida-form" onSubmit={handleProgress}>
            <div className="jida-form-header">
              <span>02</span>
              <div><h3>Update Review Progress</h3><p>{activeAssignment?.manuscriptTitle ?? "Select a manuscript from the queue below"}</p></div>
            </div>
            {progressMsg && (
              <ActionResultMessage message={progressMsg} isSuccess={progressMsg === "Progress updated."} />
            )}
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

      <div className="jida-grid-two">
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
              {assignments.slice(0, 5).map(renderAssignmentRow)}
              {assignments.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "1rem" }}>No assignments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {assignments.length > 5 && (
          <div className="jida-preview-footer">
            <button type="button" onClick={() => setActiveView("tasks")}>
              See all {assignments.length} assignments →
            </button>
          </div>
        )}
      </section>

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Activity</p>
            <h2>Review Activity</h2>
          </div>
        </div>
        <ActivityTimeline items={reviewerActivity} emptyLabel="No activity yet." />
      </section>
      </div>
      </>
      )}

      {activeView === "tasks" && (
        <section className="jida-card">
          <div className="jida-section-heading">
            <div>
              <p className="jida-section-kicker">Assignments</p>
              <h2>Review Queue</h2>
              <p className="jida-section-note">Most recently submitted manuscripts first.</p>
            </div>
            <span className="jida-badge">{filteredAssignments.length} manuscripts</span>
          </div>

          <div className="jida-toolbar">
            <input
              placeholder="Search by manuscript title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={progressFilter} onChange={(e) => setProgressFilter(e.target.value)}>
              <option value="">All statuses</option>
              {REVIEWER_PROGRESS_ORDER.map((p) => (
                <option key={p} value={p}>{statusLabel(p)}</option>
              ))}
            </select>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}>
              <option value="">Sort by title</option>
              <option value="az">Title A → Z</option>
              <option value="za">Title Z → A</option>
            </select>
          </div>

          {filteredAssignments.length === 0 && !loading ? (
            <p style={{ textAlign: "center", padding: "1rem" }}>No assignments found.</p>
          ) : (
            groupBySubmissionPeriod(filteredAssignments).map(([period, group]) => (
              <div key={period || "none"} className="jida-period-group">
                <p className="jida-period-group-label">
                  {period ? `Submission period ending ${period.slice(0, 10)}` : "No submission period recorded"}
                </p>
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
                    <tbody>{group.map(renderAssignmentRow)}</tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {activeView === "history" && (
        <section className="jida-card">
          <div className="jida-section-heading">
            <div><p className="jida-section-kicker">History</p><h2>Past Reviews</h2></div>
            <span className="jida-badge">{sortedHistory.length}</span>
          </div>

          <div className="jida-toolbar">
            <input
              placeholder="Search by manuscript title…"
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
            />
            <select value={historySortOrder} onChange={(e) => setHistorySortOrder(e.target.value as typeof historySortOrder)}>
              <option value="">Sort by title</option>
              <option value="az">Title A → Z</option>
              <option value="za">Title Z → A</option>
            </select>
          </div>

          {sortedHistory.length === 0 ? (
            <p className="jida-article-empty-note">No completed reviews yet.</p>
          ) : (
            <div className="jida-track-list">
              {sortedHistory.map((h) => (
                <article key={h.id} className="jida-track-card">
                  <div className="jida-track-main">
                    <div className="jida-track-head">
                      <h3><HighlightMatch text={h.manuscriptTitle ?? "Untitled manuscript"} query={historyQuery} /></h3>
                      {h.review && (
                        <span className="jida-track-date">{formatDateTime(h.review.createdAt)}</span>
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
          )}
        </section>
      )}

    </section>
      </div>
    </div>
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

  const [activeView, setActiveView] = useState<DashboardView>("dashboard");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"" | "az" | "za">("");
  const [announcementMsg, setAnnouncementMsg] = useState<string | null>(null);
  const [announcementSending, setAnnouncementSending] = useState(false);
  const [announcementHistory, setAnnouncementHistory] = useState<NotificationItem[]>([]);
  const formPanelRef = useRef<HTMLDivElement>(null);

  function openPanel(panel: string, manuscriptId: string) {
    setPresetManuscriptId(manuscriptId);
    setActivePanel(panel);
  }

  // Bring a newly-opened form into view instead of leaving the editor to
  // scroll and find it — panels swap in place, but a long pipeline table can
  // put the new form well below the fold.
  useEffect(() => {
    if (activePanel) formPanelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [activePanel]);

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

  useEffect(() => {
    if (activeView === "announcements") fetchAnnouncementHistory();
  }, [activeView]);

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

  async function handleDecision(e: React.FormEvent<HTMLFormElement>, stage: DecisionStage) {
    e.preventDefault();
    setDecisionMsg(null);
    const fd = new FormData(e.currentTarget);
    const manuscriptId = String(fd.get("manuscriptId") ?? "").trim();
    const decision = String(fd.get("decision") ?? "") as "ACCEPT" | "REJECT" | "REQUEST_REVISION";
    const notes = String(fd.get("notes") ?? "").trim();
    if (!manuscriptId || !decision) { setDecisionMsg("All fields required"); return; }
    try {
      await makeDecision(manuscriptId, decision, notes || undefined, stage);
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
    const specialIssue = fd.get("specialIssue") === "on";
    try {
      const { id: issueId } = await createIssue({ volume, issue, year, specialIssue });
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

  async function fetchAnnouncementHistory() {
    try {
      const res = await getNotifications();
      // An announcement is any notification with no manuscript attached —
      // a per-manuscript reminder always carries one, a broadcast never does.
      setAnnouncementHistory(res.items.filter((n) => !n.manuscriptId));
    } catch {
      /* non-blocking */
    }
  }

  async function handleAnnouncement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Captured now, not read after the `await` below — React nulls out a
    // synthetic event's `currentTarget` once the handler's synchronous part
    // returns, so reading it post-await throws even though the request
    // already succeeded. That's what made every announcement look like it
    // had failed and invited a retry, sending it again.
    const form = e.currentTarget;
    if (announcementSending) return;
    setAnnouncementSending(true);
    setAnnouncementMsg(null);
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    const body = String(fd.get("body") ?? "").trim();
    const submissionDeadline = String(fd.get("submissionDeadline") ?? "").trim();
    const openForSubmissionsValue = fd.get("openForSubmissions");
    if (!title || !body) {
      setAnnouncementMsg("Title and message are required.");
      setAnnouncementSending(false);
      return;
    }
    try {
      const res = await postAnnouncement({
        title,
        body,
        ...(submissionDeadline ? { submissionDeadline: new Date(submissionDeadline).toISOString() } : {}),
        ...(openForSubmissionsValue !== null ? { openForSubmissions: openForSubmissionsValue === "on" } : {}),
      });
      setAnnouncementMsg(`Announcement sent to ${res.recipientCount} ${res.recipientCount === 1 ? "person" : "people"}.`);
      form.reset();
      fetchAnnouncementHistory();
    } catch (err) {
      setAnnouncementMsg(err instanceof Error ? err.message : "Could not send announcement.");
    } finally {
      setAnnouncementSending(false);
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    try {
      await deleteNotification(id);
      setAnnouncementHistory((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete announcement");
    }
  }

  const unassignedCount = submissions.filter((s) => !s.assignments || s.assignments.length === 0).length;
  const decisionPendingCount = submissions.filter((s) => s.status === "UNDER_REVIEW" || s.status === "REVISION_REQUIRED").length;
  const submissionsTrend = weeklyTrend(submissions.map((s) => s.submittedAt));
  const editorActivity: ActivityEvent[] = [...submissions]
    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      title: statusLabel(s.status),
      detail: `${s.title}${s.submittedAt ? " · " + formatDateTime(s.submittedAt) : ""}`,
    }));
  const initialScreeningQueue = submissions.filter((s) => s.status === "SUBMITTED");
  const finalScreeningQueue = submissions.filter(
    (s) => s.status === "UNDER_REVIEW" && (s.assignments ?? []).some((a) => a.review),
  );
  const assignableQueue = submissions.filter(
    (s) => s.status === "UNDER_REVIEW" && (s.assignments ?? []).length === 0,
  );
  const acceptedQueue = submissions.filter((s) => s.status === "ACCEPTED");
  const allAssignments = submissions.flatMap((s) =>
    (s.assignments ?? []).map((a) => ({ submission: s, assignment: a })),
  );

  const EDITOR_STATUS_ORDER = ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUIRED", "ACCEPTED", "REJECTED", "PUBLISHED"];

  const statusFilteredSubmissions = submissions.filter((s) => {
    if (statusFilter === "UNASSIGNED" && (s.assignments?.length ?? 0) > 0) return false;
    if (statusFilter === "PENDING_DECISION" && s.status !== "UNDER_REVIEW" && s.status !== "REVISION_REQUIRED") return false;
    if (statusFilter && statusFilter !== "UNASSIGNED" && statusFilter !== "PENDING_DECISION" && s.status !== statusFilter) return false;
    if (query && !s.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const filteredSubmissions = sortOrder
    ? statusFilteredSubmissions
        .slice()
        .sort((a, b) => (sortOrder === "az" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)))
    : statusFilteredSubmissions;

  /** Groups submissions by the submission deadline in effect when each one
   * came in — most recent period first, with pre-existing rows collected in
   * one trailing group. */
  function groupBySubmissionPeriod(list: EditorSubmission[]) {
    const groups = new Map<string, EditorSubmission[]>();
    for (const s of list) {
      const key = s.submissionDeadline ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : b.localeCompare(a)));
  }

  const reviewerRoster: TeamPerson[] = reviewers.map((r) => ({
    name: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email,
    email: r.email,
    affiliation: r.affiliation,
    roleLabel: "Reviewer",
  }));
  const authorRoster: TeamPerson[] = [
    ...new Map(
      submissions
        .filter((s) => s.author)
        .map((s) => [s.author!.id, {
          name: s.author!.name ?? s.author!.email,
          email: s.author!.email,
          affiliation: s.author!.affiliation,
          roleLabel: "Author",
        } satisfies TeamPerson]),
    ).values(),
  ];

  /** One submission's tracking card — shared by the Dashboard preview and the
   * full Tasks view so the two never drift out of sync. */
  function renderSubmission(s: EditorSubmission) {
    const assignments = s.assignments ?? [];
    const submittedReviews = assignments.filter((a) => a.review);
    const canInitialScreen = s.status === "SUBMITTED";
    const canFinalScreen = s.status === "UNDER_REVIEW" && submittedReviews.length > 0;
    const canAssign = s.status === "UNDER_REVIEW" && assignments.length === 0;
    return (
      <article key={s.id} className="jida-track-card">
        <div className="jida-track-main">
          <div className="jida-track-head">
            <h3><HighlightMatch text={s.title} query={query} /></h3>
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
                      {d.editorName} · {formatDateTime(d.createdAt)}
                      {d.stage && ` · ${statusLabel(d.stage)}`}
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
          <ReminderButton manuscriptId={s.id} />
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
          {canInitialScreen && (
            <button type="button" className="jida-btn-secondary" onClick={() => openPanel("decision-initial", s.id)}>
              Initial Screening
            </button>
          )}
          {canAssign && (
            <button type="button" className="jida-btn-secondary" onClick={() => openPanel("assign", s.id)}>Assign</button>
          )}
          {canFinalScreen && (
            <button type="button" className="jida-btn-secondary" onClick={() => openPanel("decision-final", s.id)}>
              Final Screening
            </button>
          )}
          <button type="button" className="jida-btn-secondary" onClick={() => openPanel("upload", s.id)}>Upload</button>
        </aside>
      </article>
    );
  }

  return (
    <div className="jida-dash-layout">
      <DashboardSidebar role="EDITOR" active={activeView} onNavigate={setActiveView} showTeam={true} showAnnouncements={true} editorPages={true} />
      <div className="jida-dash-content">
    <section className="jida-workspace">
      {activeView === "dashboard" && (
      <>
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Editor Workspace</p>
          <h2>Coordinate editorial decisions</h2>
          <p>Assign reviewers, record decisions, and publish accepted manuscripts.</p>
        </div>
      </div>

      <div className="jida-stat-cards">
        <StatCard
          label="Total Submissions"
          value={submissions.length}
          trend={submissionsTrend}
          onClick={() => { setStatusFilter(""); setActiveView("manuscripts"); }}
        />
        <StatCard
          label="Unassigned"
          value={unassignedCount}
          onClick={() => setActiveView("peer-review")}
        />
        <StatCard
          label="Pending Decisions"
          value={decisionPendingCount}
          onClick={() => setActiveView("decisions")}
        />
      </div>

      {loading && <p style={{ padding: "1rem" }}>Loading…</p>}
      {error && <p style={{ padding: "1rem", color: "red" }}>{error}</p>}

      <div className="jida-grid-two">
      <section className="jida-card">
        <div className="jida-section-heading">
          <div><p className="jida-section-kicker">Submissions</p><h2>Editorial Pipeline</h2></div>
          <span className="jida-badge">{submissions.length} submissions</span>
        </div>
        <div className="jida-track-list">
          {submissions.slice(0, 3).map(renderSubmission)}
          {submissions.length === 0 && !loading && (
            <p style={{ textAlign: "center", padding: "1rem" }}>No submissions found.</p>
          )}
        </div>
        {submissions.length > 3 && (
          <div className="jida-preview-footer">
            <button type="button" onClick={() => setActiveView("manuscripts")}>
              See all {submissions.length} submissions →
            </button>
          </div>
        )}
      </section>

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Activity</p>
            <h2>Editorial Activity</h2>
          </div>
        </div>
        <ActivityTimeline items={editorActivity} emptyLabel="No activity yet." />
      </section>
      </div>
      </>
      )}

      {activeView === "manuscripts" && (
        <section className="jida-card">
          <div className="jida-section-heading">
            <div><p className="jida-section-kicker">Submissions</p><h2>Editorial Pipeline</h2></div>
            <span className="jida-badge">{filteredSubmissions.length} submissions</span>
          </div>

          <div className="jida-toolbar">
            <input
              placeholder="Search by title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {EDITOR_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}>
              <option value="">Sort by title</option>
              <option value="az">Title A → Z</option>
              <option value="za">Title Z → A</option>
            </select>
          </div>

          {filteredSubmissions.length === 0 && !loading ? (
            <p style={{ textAlign: "center", padding: "1rem" }}>No submissions found.</p>
          ) : (
            groupBySubmissionPeriod(filteredSubmissions).map(([period, group]) => (
              <div key={period || "none"} className="jida-period-group">
                <p className="jida-period-group-label">
                  {period ? `Submission period ending ${period.slice(0, 10)}` : "No submission period recorded"}
                </p>
                <div className="jida-track-list">{group.map(renderSubmission)}</div>
              </div>
            ))
          )}
        </section>
      )}

      {activeView === "peer-review" && (
        <>
        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">Editor Workspace</p>
            <h2>Peer Review</h2>
            <p>Assign reviewers and track how each manuscript's review assignments are progressing.</p>
          </div>
        </div>

        <div className="jida-form-panel" ref={formPanelRef}>
          <form className="jida-form" onSubmit={handleAssign}>
            <div className="jida-form-header">
              <span>01</span>
              <div><h3>Assign Reviewer</h3><p>Link a reviewer to a manuscript with a deadline — manuscripts that passed initial screening only.</p></div>
            </div>
            {assignMsg && <ActionResultMessage message={assignMsg} isSuccess={assignMsg === "Reviewer assigned successfully."} />}
            <label>
              Manuscript
              <select name="manuscriptId" defaultValue={presetManuscriptId} required>
                <option value="" disabled>Select a manuscript</option>
                {assignableQueue.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
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

        <section className="jida-card">
          <div className="jida-section-heading">
            <div><p className="jida-section-kicker">Assignments</p><h2>Review Assignments</h2></div>
            <span className="jida-badge">{allAssignments.length} assignments</span>
          </div>
          <div className="jida-table-wrap">
            <table className="jida-table">
              <thead>
                <tr>
                  <th>Manuscript</th>
                  <th>Reviewer</th>
                  <th>Deadline</th>
                  <th>Progress</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {allAssignments.map(({ submission, assignment }) => (
                  <tr key={assignment.id}>
                    <td data-label="Manuscript">{submission.title}</td>
                    <td data-label="Reviewer">{assignment.reviewer?.name ?? assignment.reviewer?.email ?? "—"}</td>
                    <td data-label="Deadline">{assignment.deadline?.slice(0, 10)}</td>
                    <td data-label="Progress"><span className={badgeClass(assignment.progress)}>{statusLabel(assignment.progress)}</span></td>
                    <td data-label="Review">{assignment.review ? <span className="jida-badge success">Submitted</span> : <span className="jida-badge warning">Outstanding</span>}</td>
                  </tr>
                ))}
                {allAssignments.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>No review assignments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        </>
      )}

      {activeView === "decisions" && (
        <>
        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">Editor Workspace</p>
            <h2>Decisions</h2>
            <p>Record the initial screening or final editorial decision for a manuscript.</p>
          </div>
        </div>

        <div className="jida-action-panels">
          <button type="button" className="jida-panel-card" onClick={() => openPanel("decision-initial", "")}>
            <span className="jida-panel-num">01</span>
            <div className="jida-panel-info">
              <strong>Editorial Decision — Initial Screening</strong>
              <p>Desk decision on a newly submitted manuscript, before peer review. {initialScreeningQueue.length} awaiting.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
          <button type="button" className="jida-panel-card" onClick={() => openPanel("decision-final", "")}>
            <span className="jida-panel-num">02</span>
            <div className="jida-panel-info">
              <strong>Editorial Decision — Final Screening</strong>
              <p>Accept, reject, or request revision once the reviews are in. {finalScreeningQueue.length} awaiting.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
        </div>

        {activePanel === "decision-initial" && (
          <ActionModal
            title="Editorial Decision — Initial Screening"
            onClose={() => { setActivePanel(null); setDecisionMsg(null); }}
          >
            <form className="jida-form" onSubmit={(e) => handleDecision(e, "INITIAL_SCREENING")}>
              <div className="jida-form-header">
                <span>01</span>
                <div><h3>Initial Screening</h3><p>A desk decision before peer review — manuscripts submitted by the author only.</p></div>
              </div>
              {decisionMsg && (
                <ActionResultMessage message={decisionMsg} isSuccess={decisionMsg === "Decision recorded."} />
              )}
              <label>
                Manuscript
                <select name="manuscriptId" defaultValue={presetManuscriptId} required>
                  <option value="" disabled>Select a manuscript</option>
                  {initialScreeningQueue.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Decision
                <select name="decision" defaultValue="">
                  <option value="" disabled>Select decision</option>
                  <option value="ACCEPT">Accept — send to peer review</option>
                  <option value="REJECT">Reject</option>
                  <option value="REQUEST_REVISION">Request Revision</option>
                </select>
              </label>
              <label>Comments (visible to the author and other editors)<textarea name="notes" rows={3} placeholder="Explain the reasoning behind this decision" /></label>
              <button type="submit" className="jida-btn-primary">Record Decision</button>
            </form>
          </ActionModal>
        )}

        {activePanel === "decision-final" && (
          <ActionModal
            title="Editorial Decision — Final Screening"
            onClose={() => { setActivePanel(null); setDecisionMsg(null); }}
          >
            <form className="jida-form" onSubmit={(e) => handleDecision(e, "FINAL_SCREENING")}>
              <div className="jida-form-header">
                <span>02</span>
                <div><h3>Final Screening</h3><p>Accept, reject, or request revision — manuscripts with a reviewer's evaluation in.</p></div>
              </div>
              {decisionMsg && (
                <ActionResultMessage message={decisionMsg} isSuccess={decisionMsg === "Decision recorded."} />
              )}
              <label>
                Manuscript
                <select name="manuscriptId" defaultValue={presetManuscriptId} required>
                  <option value="" disabled>Select a manuscript</option>
                  {finalScreeningQueue.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
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
              <label>Comments (visible to the reviewer and other editors)<textarea name="notes" rows={3} placeholder="Explain the reasoning behind this decision" /></label>
              <button type="submit" className="jida-btn-primary">Record Decision</button>
            </form>
          </ActionModal>
        )}
        </>
      )}

      {activeView === "publication" && (
        <>
        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">Editor Workspace</p>
            <h2>Publication</h2>
            <p>Publish accepted manuscripts to a journal issue, and optionally send back an edited file.</p>
          </div>
        </div>

        <div className="jida-form-panel" ref={formPanelRef}>
          <form className="jida-form" onSubmit={handlePublish}>
            <div className="jida-form-header">
              <span>01</span>
              <div><h3>Publish to Issue</h3><p>Create an issue and publish an accepted manuscript — manuscripts that passed final screening only.</p></div>
            </div>
            {issueMsg && (
              <ActionResultMessage message={issueMsg} isSuccess={issueMsg.startsWith("Manuscript published")} />
            )}

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
                {acceptedQueue.map((s) => (
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
            <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" name="specialIssue" style={{ width: "auto" }} />
              Special Issue
            </label>
            <button type="submit" className="jida-btn-primary">Publish to Journal Issue</button>
          </form>
        </div>

        <section className="jida-card">
          <div className="jida-section-heading">
            <div><p className="jida-section-kicker">Production</p><h2>Awaiting Publication</h2></div>
            <span className="jida-badge">{acceptedQueue.length} accepted</span>
          </div>
          <div className="jida-track-list">
            {acceptedQueue.slice(0, 5).map(renderSubmission)}
            {acceptedQueue.length === 0 && (
              <p style={{ textAlign: "center", padding: "1rem" }}>No accepted manuscripts awaiting publication.</p>
            )}
          </div>
        </section>

        {activePanel !== "upload" ? (
          <button type="button" className="jida-btn-secondary" onClick={() => setActivePanel("upload")}>
            + Upload an edited manuscript <span className="jida-optional">(optional)</span>
          </button>
        ) : (
          <div className="jida-form-panel" ref={formPanelRef}>
            <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setUploadMsg(null); }}>← Hide</button>
            <form className="jida-form" onSubmit={handleUploadEditedFile} encType="multipart/form-data">
              <div className="jida-form-header">
                <span>02</span>
                <div><h3>Upload Edited Manuscript <span className="jida-optional">(optional)</span></h3><p>Send back a revised file with remarks for the author.</p></div>
              </div>
              {uploadMsg && (
                <ActionResultMessage message={uploadMsg} isSuccess={uploadMsg.startsWith("Edited manuscript uploaded")} />
              )}
              <label>
                Manuscript
                <select name="manuscriptId" defaultValue={presetManuscriptId} required>
                  <option value="" disabled>Select a manuscript</option>
                  {submissions.map((s) => (
                    <option key={s.id} value={s.id}>{s.title} — {statusLabel(s.status)}</option>
                  ))}
                </select>
              </label>
              <label>Edited file (PDF / DOCX) <span className="jida-optional">(optional)</span><input type="file" name="file" accept=".pdf,.docx" /></label>
              <label>Remarks for the author<textarea name="remarks" rows={3} placeholder="Explain what was changed" required /></label>
              <button type="submit" className="jida-btn-primary">Upload Edited Manuscript</button>
            </form>
          </div>
        )}
        </>
      )}

      {activeView === "team" && (
        <>
          <TeamRoster title="Reviewers" people={reviewerRoster} />
          <TeamRoster title="Authors" people={authorRoster} />
        </>
      )}

      {activeView === "announcements" && (
        <>
          <div className="jida-page-title">
            <div>
              <p className="jida-section-kicker">Editor Workspace</p>
              <h2>Announcements</h2>
              <p>Create a submission period and broadcast it to every author, reviewer, and editor.</p>
            </div>
          </div>

          <div className="jida-form-panel">
            <form className="jida-form" onSubmit={handleAnnouncement}>
              {announcementMsg && (
                <ActionResultMessage
                  message={announcementMsg}
                  isSuccess={announcementMsg.startsWith("Announcement sent")}
                />
              )}
              <label>Title<input name="title" placeholder="e.g. Volume 8 submissions now open" required /></label>
              <label>Message<textarea name="body" rows={4} placeholder="Details for everyone — deadline, scope, anything they need to know" required /></label>
              <label>
                Submission deadline <span className="jida-optional">(optional)</span>
                <input type="date" name="submissionDeadline" />
              </label>
              <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" name="openForSubmissions" defaultChecked style={{ width: "auto" }} />
                Submissions are open
              </label>
              <button type="submit" className="jida-btn-primary" disabled={announcementSending}>
                {announcementSending ? "Sending…" : "Send Announcement"}
              </button>
            </form>
          </div>

          <section className="jida-card">
            <div className="jida-section-heading">
              <div><p className="jida-section-kicker">History</p><h2>Past Announcements</h2></div>
              <span className="jida-badge">{announcementHistory.length} sent</span>
            </div>
            {announcementHistory.length === 0 ? (
              <p className="jida-article-empty-note">No announcements sent yet.</p>
            ) : (
              <ul className="jida-notification-list jida-notification-list-full">
                {announcementHistory.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className="jida-notification-clear"
                      onClick={() => handleDeleteAnnouncement(n.id)}
                      aria-label="Delete announcement"
                      title="Delete"
                    >
                      <X size={13} />
                    </button>
                    <strong>{n.title}</strong>
                    <p>{n.body}</p>
                    <time title={new Date(n.visibleAt).toLocaleString()}>{formatDateTime(n.visibleAt)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
      </div>
    </div>
  );
}

// ─── ArchiveWorkspace ──────────────────────────────────────────────────────

const ARCHIVE_AZ_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function ArchiveWorkspace() {
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openYear, setOpenYear] = useState<number | null>(null);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);

  // Filter bar state, borrowed from Taylor & Francis's subject listing page.
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<AdvancedSearchField>("any");
  const [letter, setLetter] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const skipInitialSearch = useRef(true);

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

  // The free-text box re-queries the backend (title/author/abstract fold
  // into `q`; "Keywords" becomes the `keyword` filter) — same split used on
  // the advanced search page, since that's what the API actually supports.
  useEffect(() => {
    if (skipInitialSearch.current) {
      skipInitialSearch.current = false;
      return;
    }
    const t = setTimeout(async () => {
      try {
        const q = searchTerm.trim();
        const isKeyword = searchField === "keyword";
        setArticles(await getPublicArticles(!isKeyword ? q || undefined : undefined, isKeyword ? q || undefined : undefined));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm, searchField]);

  // Group issues under a year, newest year first — the top level of the
  // year accordion below.
  const issuesByYear = new Map<number, PublicIssue[]>();
  for (const issue of issues) {
    const bucket = issuesByYear.get(issue.year) ?? [];
    bucket.push(issue);
    issuesByYear.set(issue.year, bucket);
  }
  const orderedYears = Array.from(issuesByYear.keys()).sort((a, b) => b - a);

  const availableLetters = new Set(
    articles.map((a) => a.manuscript.title.trim()[0]?.toUpperCase()).filter((c) => c && /[A-Z]/.test(c)),
  );
  const subjects = Array.from(
    new Set(articles.flatMap((a) => a.manuscript.keywords ?? [])),
  ).sort((x, y) => x.localeCompare(y));
  const years = Array.from(new Set(issues.map((i) => i.year))).sort((a, b) => b - a);

  const filteredArticles = articles.filter((a) => {
    if (letter && a.manuscript.title.trim()[0]?.toUpperCase() !== letter) return false;
    if (subject && !(a.manuscript.keywords ?? []).includes(subject)) return false;
    if (year && a.issue?.year !== Number(year)) return false;
    return true;
  });

  const hasActiveFilters = Boolean(searchTerm.trim() || letter || subject || year);

  function clearAllFilters() {
    setSearchTerm("");
    setSearchField("any");
    setLetter(null);
    setSubject("");
    setYear("");
  }

  return (
    <section className="jida-workspace">
      <div className="jida-archive-header">
        <div>
          <p className="jida-section-kicker">Public Archive</p>
          <h1>Archives</h1>
          <p>Browse JIDA&apos;s published volumes and issues by year, or search and filter below.</p>
        </div>
      </div>

      {loading && <p style={{ padding: "1rem" }}>Loading…</p>}
      {error && <p style={{ padding: "1rem", color: "red" }}>{error}</p>}

      <section className="jida-card jida-archive-filterbar">
        <form
          className="jida-archive-filter-search"
          onSubmit={(e) => {
            e.preventDefault();
            setSearchTerm((v) => v.trim());
          }}
        >
          <input
            type="search"
            placeholder="Search articles and special issues…"
            aria-label="Search the archive"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            aria-label="Search in"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as AdvancedSearchField)}
          >
            {ADVANCED_SEARCH_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <button type="submit">
            <Search size={15} />
            Search
          </button>
        </form>

        <div className="jida-archive-az">
          <span className="jida-archive-az-label">Browse A—Z</span>
          <div className="jida-archive-az-list">
            {ARCHIVE_AZ_LETTERS.map((l) => (
              <button
                key={l}
                type="button"
                className={`jida-archive-az-letter${letter === l ? " active" : ""}`}
                disabled={!availableLetters.has(l)}
                onClick={() => setLetter((current) => (current === l ? null : l))}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="jida-archive-filter-row">
          <label>
            Subject
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Publication date
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Any year</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          {hasActiveFilters && (
            <button type="button" className="jida-filter-clear" onClick={clearAllFilters}>
              Clear all filters
            </button>
          )}
        </div>
      </section>

      {hasActiveFilters ? (
        <section className="jida-card">
          <div className="jida-section-heading">
            <div><p className="jida-section-kicker">Results</p><h2>Articles &amp; special issues</h2></div>
            <span className="jida-badge info">{filteredArticles.length} results</span>
          </div>
          <ul className="jida-archive-results-list">
            {filteredArticles.map((a) => (
              <li key={a.id}>
                <span className="jida-archive-result-type">Research Article</span>
                <Link href={`/archive/${a.slug}`} className="jida-archive-result-title">
                  {a.manuscript.title}
                </Link>
                <p className="jida-archive-result-authors">
                  <PublicAuthorLine author={a.manuscript.author} coAuthors={a.manuscript.coAuthors} />
                </p>
                <time className="jida-archive-result-date" dateTime={a.publishedAt}>
                  Published Online: {a.publishedAt.slice(0, 10)}
                </time>
              </li>
            ))}
            {filteredArticles.length === 0 && !loading && (
              <li className="jida-archive-result-empty">No articles match your search and filters.</li>
            )}
          </ul>
        </section>
      ) : (
      <div className="jida-archive-accordion" role="tablist">
        {orderedYears.map((year) => {
          const isYearOpen = openYear === year;
          return (
            <div key={year} className={`jida-archive-accordion-item${isYearOpen ? " open" : ""}`}>
              <button
                type="button"
                className="jida-archive-accordion-trigger"
                onClick={() => {
                  setOpenYear((current) => (current === year ? null : year));
                  setOpenIssueId(null);
                }}
                aria-expanded={isYearOpen}
              >
                {isYearOpen ? <Minus size={16} /> : <Plus size={16} />}
                <span>{year}</span>
              </button>

              {isYearOpen && (
                <div className="jida-archive-accordion-panel">
                  {(issuesByYear.get(year) ?? []).map((issue) => {
                    const isIssueOpen = openIssueId === issue.id;
                    const count = issueArticleCount(issue);
                    return (
                      <div key={issue.id} className="jida-archive-issue-row">
                        <button
                          type="button"
                          className="jida-archive-issue-trigger"
                          onClick={() => setOpenIssueId((current) => (current === issue.id ? null : issue.id))}
                          aria-expanded={isIssueOpen}
                        >
                          {isIssueOpen ? <Minus size={13} /> : <Plus size={13} />}
                          <span>{formatIssueTitle(issue)}</span>
                          <span className="jida-archive-issue-count">
                            {count} article{count === 1 ? "" : "s"}
                          </span>
                        </button>

                        {isIssueOpen && (
                          issue.publications && issue.publications.length > 0 ? (
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
                                  <time className="jida-issue-article-date" dateTime={pub.publishedAt}>
                                    Published Online: {pub.publishedAt.slice(0, 10)}
                                  </time>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="jida-issue-empty">No articles in this issue yet.</p>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {orderedYears.length === 0 && !loading && (
          <p style={{ padding: "1rem" }}>No issues published yet.</p>
        )}
      </div>
      )}
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

/** Issues whose formatted title (or free title) mentions one of the search
 * terms, scoped to a publication year when one is chosen. A year alone (no
 * terms) surfaces every issue in that year. */
function matchIssues(allIssues: PublicIssue[], terms: string[], yr: string): PublicIssue[] {
  return allIssues.filter((issue) => {
    if (yr && issue.year !== Number(yr)) return false;
    if (terms.length === 0) return Boolean(yr);
    const haystack = `${formatIssueTitle(issue)} ${issue.title ?? ""}`.toLowerCase();
    return terms.some((term) => haystack.includes(term.toLowerCase()));
  });
}

export function AdvancedSearchWorkspace() {
  const [rows, setRows] = useState<AdvancedSearchRow[]>(() => [newAdvancedSearchRow()]);
  const [year, setYear] = useState("");
  const [years, setYears] = useState<number[]>([]);
  const [allIssues, setAllIssues] = useState<PublicIssue[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [results, setResults] = useState<PublicArticle[]>([]);
  const [matchedIssues, setMatchedIssues] = useState<PublicIssue[]>([]);
  const [searching, setSearching] = useState(false);

  async function runSearch(
    queryTerms: string[],
    keywordTerm: string | undefined,
    yr: string,
    allTerms: string[],
    issuesList: PublicIssue[],
  ) {
    setSearching(true);
    try {
      let articles = await getPublicArticles(queryTerms.join(" ") || undefined, keywordTerm);
      if (yr) articles = articles.filter((a) => a.issue?.year === Number(yr));
      setResults(articles);
      setMatchedIssues(matchIssues(issuesList, allTerms, yr));
    } catch {
      setResults([]);
      setMatchedIssues([]);
    } finally {
      setSearching(false);
    }
  }

  // Load every issue (for the year filter and for matching issues by
  // title/volume), then — if the homepage search or the archive's search
  // shortcut handed off a query via the URL — prefill the form and run it
  // immediately so results show up without a second click.
  useEffect(() => {
    getPublicIssues()
      .then((issues) => {
        setAllIssues(issues);
        setYears(Array.from(new Set(issues.map((i) => i.year))).sort((a, b) => b - a));

        const params = new URLSearchParams(window.location.search);
        const q = params.get("q") ?? "";
        const kw = params.get("keyword") ?? "";
        const yr = params.get("year") ?? "";
        if (!q && !kw && !yr) return;

        const initialRows: AdvancedSearchRow[] = [];
        if (q) initialRows.push({ ...newAdvancedSearchRow(), term: q, field: "any" });
        if (kw) initialRows.push({ ...newAdvancedSearchRow(), term: kw, field: "keyword" });
        if (initialRows.length > 0) setRows(initialRows);
        if (yr) setYear(yr);

        runSearch(q ? [q] : [], kw || undefined, yr, [q, kw].filter(Boolean), issues);
      })
      .catch(() => {
        /* Year filter and prefill are a nicety — leave the form empty if issues can't load. */
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
    setResults([]);
    setMatchedIssues([]);
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
    const allTerms = filled.map((row) => row.term.trim());

    runSearch(queryTerms, keywordRow?.term.trim(), year, allTerms, allIssues);
  }

  const resultCount = results.length + matchedIssues.length;

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

      <section className="jida-card jida-advsearch-results" aria-live="polite">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Results</p>
            <h2>Search results</h2>
          </div>
          {resultCount > 0 && <span className="jida-badge info">{resultCount} found</span>}
        </div>

        {searching ? (
          <p className="jida-home-state">Searching…</p>
        ) : resultCount === 0 ? (
          <p className="jida-advsearch-noresult">No result.</p>
        ) : (
          <>
            {matchedIssues.length > 0 && (
              <div className="jida-advsearch-result-group">
                <h3>Issues</h3>
                <ul className="jida-advsearch-issue-list">
                  {matchedIssues.map((issue) => {
                    const count = issueArticleCount(issue);
                    return (
                      <li key={issue.id}>
                        <span className="jida-advsearch-issue-title">{formatIssueTitle(issue)}</span>
                        <span className="jida-archive-issue-count">
                          {count} article{count === 1 ? "" : "s"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {results.length > 0 && (
              <div className="jida-advsearch-result-group">
                <h3>Articles</h3>
                <ol className="jida-issue-contents">
                  {results.map((article) => (
                    <li key={article.id}>
                      <Link href={`/archive/${article.slug}`} className="jida-issue-article-title">
                        {article.manuscript.title}
                      </Link>
                      <span className="jida-issue-article-authors">
                        <PublicAuthorLine
                          author={article.manuscript.author}
                          coAuthors={article.manuscript.coAuthors}
                        />
                        {article.issue ? ` — ${formatIssueTitle(article.issue)}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </section>
    </section>
  );
}

export function ReviewArticleButton({ slug }: { slug: string }) {
  return (
    <button
      type="button"
      className="jida-btn-primary jida-article-pdf-btn"
      onClick={() =>
        viewFile(`/api/public/articles/${slug}/download`).catch((e) =>
          alert(e instanceof Error ? e.message : "Failed to open article"),
        )
      }
    >
      View PDF
    </button>
  );
}

/** "Cite this article" and "Copy link" — the two clipboard actions on an
 * article page's byline row, borrowed from Taylor & Francis Online's
 * article header. `citation` and `url` are built server-side from real
 * article fields, never fabricated. */
export function ArticleCiteShare({ citation, url }: { citation: string; url: string }) {
  const [showCite, setShowCite] = useState(false);
  const [copied, setCopied] = useState<"cite" | "link" | null>(null);

  async function copy(text: string, which: "cite" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied((current) => (current === which ? null : current)), 2000);
    } catch {
      /* Clipboard permission denied — the text is still visible to select and copy by hand. */
    }
  }

  return (
    <div className="jida-article-actions">
      <div className="jida-article-actions-row">
        <button
          type="button"
          className="jida-article-action-btn"
          onClick={() => setShowCite((v) => !v)}
          aria-expanded={showCite}
        >
          <Quote size={14} />
          Cite this article
        </button>
        <button type="button" className="jida-article-action-btn" onClick={() => copy(url, "link")}>
          {copied === "link" ? <Check size={14} /> : <Link2 size={14} />}
          {copied === "link" ? "Link copied" : "Copy link"}
        </button>
      </div>

      {showCite && (
        <div className="jida-article-cite-box">
          <p>{citation}</p>
          <button type="button" className="jida-advsearch-reset" onClick={() => copy(citation, "cite")}>
            {copied === "cite" ? "Copied" : "Copy citation"}
          </button>
        </div>
      )}
    </div>
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

/**
 * Static reference matrix — not a separate permissions engine. Each row
 * documents an actual `requireRole(...)` gate in the backend (Jida-Backend
 * src/routes/{admin,editor,manuscripts,reviewer}.ts); roles are expanded
 * through the same implication rules the API enforces (a Chief Editor
 * implicitly holds Editor/Reviewer/Author, an Associate Editor holds Editor),
 * so this reflects what the API actually does, not an aspirational list.
 */
const PERMISSION_MATRIX: { action: string; roles: UserRole[] }[] = [
  { action: "Submit a manuscript", roles: ["AUTHOR", "CHIEF_EDITOR", "ADMIN"] },
  { action: "Review a manuscript", roles: ["REVIEWER", "CHIEF_EDITOR", "ADMIN"] },
  { action: "Make an editorial decision", roles: ["EDITOR", "CHIEF_EDITOR", "ASSOCIATE_EDITOR", "ADMIN"] },
  { action: "Publish to a journal issue", roles: ["EDITOR", "CHIEF_EDITOR", "ASSOCIATE_EDITOR", "ADMIN"] },
  { action: "Manage users and roles", roles: ["ADMIN"] },
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
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const createRef = useRef<HTMLFormElement>(null);
  const usersTableRef = useRef<HTMLElement>(null);

  const [activeView, setActiveView] = useState<DashboardView>("dashboard");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeView !== "settings") return;
    setSettingsLoading(true);
    adminGetSettings()
      .then(setSettings)
      .catch((e) => setSettingsMsg(e instanceof Error ? e.message : "Failed to load settings"))
      .finally(() => setSettingsLoading(false));
  }, [activeView]);

  async function handleToggleStatus(user: AdminUser) {
    setTogglingStatus(user.id);
    try {
      const updated = await adminSetUserStatus(user.id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update account status");
    } finally {
      setTogglingStatus(null);
    }
  }

  async function handleToggleSetting(key: keyof AdminSettings) {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSettingsMsg(null);
    try {
      await adminUpdateSettings({ [key]: next[key] });
    } catch (err) {
      setSettings(settings);
      setSettingsMsg(err instanceof Error ? err.message : "Could not update setting");
    }
  }

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

  const roster: TeamPerson[] = users.map((u) => ({
    name: u.name || u.email,
    email: u.email,
    affiliation: u.institution,
    roleLabel: ROLE_LABELS[u.role] ?? u.role,
  }));

  const filteredUsers = users.filter((u) => {
    if (roleFilter && !(u.roles?.length ? u.roles : [u.role]).includes(roleFilter as UserRole)) return false;
    if (query) {
      const haystack = `${u.name ?? ""} ${u.email}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="jida-dash-layout">
      <DashboardSidebar role="ADMIN" active={activeView} onNavigate={setActiveView} showTeam={true} showRoles={true} showSettings={true} />
      <div className="jida-dash-content">
    {(activeView === "dashboard" || activeView === "tasks") && (
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

          <div className="jida-stat-cards">
            <StatCard
              label="Total Users"
              value={users.length}
              trend={weeklyTrend(users.map((u) => u.createdAt))}
              onClick={() => { setRoleFilter(""); usersTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            />
            <StatCard
              label="Authors"
              value={users.filter((u) => u.role === "AUTHOR").length}
              onClick={() => { setRoleFilter("AUTHOR"); usersTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            />
            <StatCard
              label="Reviewers"
              value={users.filter((u) => u.role === "REVIEWER").length}
              onClick={() => { setRoleFilter("REVIEWER"); usersTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            />
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
          <section className="jida-card" ref={usersTableRef}>
            <div className="jida-section-heading">
              <div>
                <p className="jida-section-kicker">Directory</p>
                <h2>All Users</h2>
              </div>
              <span className="jida-badge">{filteredUsers.length} accounts</span>
            </div>

            <div className="jida-toolbar">
              <input
                placeholder="Search by name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">All roles</option>
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
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
                      <th>Status</th>
                      <th>Last Active</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
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
                        <td data-label="Status">
                          <span className={u.isActive === false ? "jida-badge danger" : "jida-badge success"}>
                            {u.isActive === false ? "Inactive" : "Active"}
                          </span>
                        </td>
                        <td data-label="Last Active">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                        <td data-label="Joined">{u.createdAt?.slice(0, 10) ?? "—"}</td>
                        <td data-label="Actions">
                          <div className="jida-admin-row-actions">
                            <RoleEditor user={u} onSaved={fetchUsers} />
                            <button
                              type="button"
                              className="jida-btn-secondary"
                              disabled={togglingStatus === u.id}
                              onClick={() => handleToggleStatus(u)}
                            >
                              {togglingStatus === u.id ? "…" : u.isActive === false ? "Reactivate" : "Deactivate"}
                            </button>
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
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "1rem" }}>
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

      {/* These already ship a full sidebar layout of their own — nesting
          them here would stack a second sidebar inside Admin's, so it's
          collapsed via CSS and only each workspace's content area shows. */}
      {activeTab === "author"   && <div className="jida-nested-workspace"><AuthorWorkspace /></div>}
      {activeTab === "reviewer" && <div className="jida-nested-workspace"><ReviewerWorkspace /></div>}
      {activeTab === "editor"   && <div className="jida-nested-workspace"><EditorWorkspace /></div>}
    </>
    )}

    {activeView === "team" && (
      <section className="jida-workspace">
        <TeamRoster title="All Users" people={roster} />
      </section>
    )}

    {activeView === "roles" && (
      <section className="jida-workspace">
        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">Admin</p>
            <h2>Roles &amp; Permissions</h2>
            <p>A reference of what each role can actually do — reflects the API's own access rules, not a separately configurable list.</p>
          </div>
        </div>
        <section className="jida-card">
          <div className="jida-table-wrap">
            <table className="jida-table">
              <thead>
                <tr>
                  <th>Action</th>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <th key={r}>{ROLE_LABELS[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MATRIX.map((row) => (
                  <tr key={row.action}>
                    <td data-label="Action">{row.action}</td>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <td key={r} data-label={ROLE_LABELS[r]} style={{ textAlign: "center" }}>
                        {row.roles.includes(r) ? <Check size={16} color="#16653a" /> : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    )}

    {activeView === "settings" && (
      <section className="jida-workspace">
        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">Admin</p>
            <h2>System Settings</h2>
            <p>Platform-wide configuration. Toggles here are wired to real behavior — nothing here is decorative.</p>
          </div>
        </div>
        <section className="jida-card">
          {settingsLoading ? (
            <p style={{ padding: "1rem" }}>Loading…</p>
          ) : (
            <>
              {settingsMsg && <ActionResultMessage message={settingsMsg} isSuccess={false} />}
              <div className="jida-switch">
                <span>
                  <b>Automatic database backups</b>
                  <br />
                  <small className="jida-muted">Run the scheduled daily backup job (src/services/scheduler.ts).</small>
                </span>
                <button
                  type="button"
                  className={`jida-toggle${settings?.automaticBackupsEnabled ? " on" : ""}`}
                  role="switch"
                  aria-checked={!!settings?.automaticBackupsEnabled}
                  onClick={() => handleToggleSetting("automaticBackupsEnabled")}
                />
              </div>
              <div className="jida-switch">
                <span>
                  <b>In-app &amp; email notifications</b>
                  <br />
                  <small className="jida-muted">Send workflow notifications (assignment, decision, publication emails).</small>
                </span>
                <button
                  type="button"
                  className={`jida-toggle${settings?.emailNotificationsEnabled ? " on" : ""}`}
                  role="switch"
                  aria-checked={!!settings?.emailNotificationsEnabled}
                  onClick={() => handleToggleSetting("emailNotificationsEnabled")}
                />
              </div>
              <div className="jida-switch">
                <span>
                  <b>Two-factor authentication</b>
                  <br />
                  <small className="jida-muted">Require a second factor for editorial and admin accounts. Not yet built — planned.</small>
                </span>
                <button type="button" className="jida-toggle" role="switch" aria-checked={false} disabled title="Planned — not yet implemented" />
              </div>
            </>
          )}
        </section>
      </section>
    )}
      </div>
    </div>
  );
}
