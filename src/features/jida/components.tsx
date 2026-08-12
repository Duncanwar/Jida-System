"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, X, User } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
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
  type ManuscriptSummary,
  type Assignment,
  type EditorSubmission,
  type PublicIssue,
  type PublicArticle,
  type ReviewProgress,
  type ReviewRecommendation,
  type AdminUser,
  type UserRole,
  type ReviewerOption,
} from "@/lib/api";
import { clearSession, readRole, readToken } from "@/lib/session";

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

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    setUserRole(readRole());
    setIsLoggedIn(!!readToken());
  }, [pathname]);

  function handleLogout() {
    clearSession();
    router.push("/");
  }
  
  const isPublicPage = pathname === "/" || pathname === "/archive";
  const roleLabel = userRole
    ? userRole.charAt(0) + userRole.slice(1).toLowerCase()
    : null;

  return (
    <>
      <header className="jida-header">
        <Link href="/" className="jida-header-brand">
          <span className="jida-header-kicker">Journal of Inter-Discourse Academia</span>
          <strong className="jida-header-title">JIDA System</strong>
        </Link>

        <div className="jida-header-right">
          {!isPublicPage && isLoggedIn && roleLabel && (
            <span className="jida-role-badge">{roleLabel} Portal</span>
          )}
          <nav className="jida-header-nav">
            {isPublicPage && !isLoggedIn && (
              <>
                <Link href="/signup" className="jida-nav-ghost">Create Account</Link>
                <Link href="/login" className="jida-nav-btn">Sign In</Link>
              </>
            )}
            
            {isPublicPage && isLoggedIn && (
              <>
                <Link
                  href={
                    userRole === "AUTHOR" ? "/author"
                    : userRole === "REVIEWER" ? "/reviewer"
                    : userRole === "ADMIN" ? "/admin"
                    : "/editor"
                  }
                  className="jida-nav-ghost"
                >
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
  const submitRef = useRef<HTMLFormElement>(null);
  const reviseRef = useRef<HTMLFormElement>(null);

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
    try {
      const res = await submitManuscript(fd);
      setSubmitMsg(`Manuscript submitted — ID: ${res.id}`);
      submitRef.current?.reset();
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
            <label>Title<input name="title" placeholder="Enter manuscript title" required /></label>
            <label>Abstract<textarea name="abstract" placeholder="Briefly summarize the manuscript" rows={4} required /></label>
            <label>Keywords<input name="keywords" placeholder="Comma-separated keywords" /></label>
            <label>References<textarea name="references" placeholder="Paste references or citation list" rows={3} /></label>
            <label>Manuscript file (PDF / DOCX)<input type="file" name="file" accept=".pdf,.docx" required /></label>
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
          <div className="jida-table-wrap">
            <table className="jida-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Editor&apos;s Comments</th>
                  <th>Editor&apos;s Revision</th>
                  <th>Published Article</th>
                </tr>
              </thead>
              <tbody>
                {manuscripts.map((item) => {
                  const latestFile = item.files?.[0];
                  const editorFile = latestFile?.source === "EDITOR" ? latestFile : undefined;
                  return (
                  <tr key={item.id}>
                    <td data-label="ID"><code style={{ fontSize: "0.75rem" }}>{item.id}</code></td>
                    <td data-label="Title">{item.title}</td>
                    <td data-label="Status"><span className={badgeClass(item.status)}>{statusLabel(item.status)}</span></td>
                    <td data-label="Submitted">{(item.createdAt ?? item.submittedAt)?.slice(0, 10) ?? "—"}</td>
                    <td data-label="Editor's Comments">
                      {item.decisions && item.decisions.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {item.decisions.map((d, i) => (
                            <div key={i}>
                              <span className={badgeClass(d.decision)} style={{ fontSize: "0.7rem" }}>{statusLabel(d.decision)}</span>
                              {" "}
                              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{d.createdAt.slice(0, 10)}</span>
                              {d.notes && <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem" }}>{d.notes}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Editor's Revision">
                      {editorFile ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <button
                            type="button"
                            className="jida-badge info"
                            style={{ cursor: "pointer", border: "none", alignSelf: "flex-start" }}
                            onClick={() =>
                              downloadFile(
                                `/api/manuscripts/${item.id}/files/${editorFile.id}/download`,
                                editorFile.originalName,
                              ).catch((e) => alert(e instanceof Error ? e.message : "Download failed"))
                            }
                          >
                            Download
                          </button>
                          {editorFile.remarks && <span style={{ fontSize: "0.75rem" }}>{editorFile.remarks}</span>}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Published Article">
                      {item.publication ? (
                        <button
                          type="button"
                          className="jida-badge info"
                          style={{ cursor: "pointer", border: "none" }}
                          onClick={() =>
                            downloadFile(
                              `/api/manuscripts/published/${item.publication!.slug}/download`,
                              `${item.title}.pdf`,
                            ).catch((e) => alert(e instanceof Error ? e.message : "Download failed"))
                          }
                        >
                          Download
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                  );
                })}
                {manuscripts.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "1rem" }}>No manuscripts found.</td></tr>
                )}
              </tbody>
            </table>
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
    const file = fd.get("file");
    try {
      await submitReview(id, {
        commentsToAuthor: String(fd.get("commentsToAuthor") ?? ""),
        commentsToEditor: String(fd.get("commentsToEditor") ?? ""),
        recommendation: String(fd.get("recommendation") ?? "") as ReviewRecommendation,
        file: file instanceof File && file.size > 0 ? file : null,
      });
      setReviewMsg("Review submitted successfully.");
      const [a, h] = await Promise.all([getAssignments(), getReviewHistory()]);
      setAssignments(a);
      setHistory(h);
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
              <div><h3>Submit Review Evaluation</h3><p>{activeAssignment?.manuscriptTitle ?? "Select a manuscript from the queue below"}</p></div>
            </div>
            {reviewMsg && <p>{reviewMsg}</p>}
            <input type="hidden" name="assignmentId" value={presetAssignmentId} />
            <label>Comments to Author<textarea name="commentsToAuthor" rows={3} placeholder="Feedback for the author" required /></label>
            <label>Comments to Editor<textarea name="commentsToEditor" rows={3} placeholder="Notes for the editor" required /></label>
            <label>
              Recommendation
              <select name="recommendation" defaultValue="">
                <option value="" disabled>Select recommendation</option>
                <option value="ACCEPT">Accept</option>
                <option value="MINOR_REVISION">Minor Revision</option>
                <option value="MAJOR_REVISION">Major Revision</option>
                <option value="REJECT">Reject</option>
              </select>
            </label>
            <label>Annotated file (optional)<input type="file" name="file" accept=".pdf,.docx" /></label>
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
          <div><p className="jida-section-kicker">Assignments</p><h2>Review Queue</h2></div>
          <span className="jida-badge">{assignments.length} manuscripts</span>
        </div>
        <div className="jida-table-wrap">
          <table className="jida-table">
            <thead>
              <tr>
                <th>Manuscript</th>
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
                      <td colSpan={6} style={{ background: "var(--jida-surface-alt, rgba(0,0,0,0.03))" }}>
                        <p style={{ margin: "0.5rem 0" }}><strong>Abstract:</strong> {a.abstract || "—"}</p>
                        <p style={{ margin: "0.5rem 0" }}><strong>Keywords:</strong> {a.keywords?.length ? a.keywords.join(", ") : "—"}</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {assignments.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "1rem" }}>No assignments found.</td></tr>
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
          <div className="jida-table-wrap">
            <table className="jida-table">
              <thead>
                <tr><th>Manuscript</th><th>Recommendation</th><th>Comments to Author</th><th>Comments to Editor</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.manuscriptTitle ?? "Untitled manuscript"}</td>
                    <td><span className={badgeClass(h.recommendation ?? "pending")}>{h.recommendation ? statusLabel(h.recommendation) : "—"}</span></td>
                    <td>{h.commentsToAuthor ?? "—"}</td>
                    <td>{h.commentsToEditor ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    const fd = new FormData(e.currentTarget);
    const volume = Number(fd.get("volume"));
    const issue = Number(fd.get("issueNum"));
    const year = Number(fd.get("year"));
    const manuscriptId = String(fd.get("manuscriptId") ?? "").trim();
    const scholar = fd.get("scholar") === "on";
    try {
      const { id: issueId } = await createIssue({ volume, issue, year });
      const publication = await publishToIssue(issueId, manuscriptId);
      // FR-E12 — expose the published work to Google Scholar indexing.
      if (scholar && publication?.id) {
        await setScholarReady(publication.id, true);
      }
      setIssueMsg(scholar ? "Manuscript published and marked for Google Scholar indexing." : "Manuscript published to issue.");
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
        <div className="jida-table-wrap">
          <table className="jida-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Author</th>
                <th>Status</th>
                <th>Reviewers</th>
                <th>Files</th>
                <th>Editor&apos;s Comments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td data-label="ID"><code style={{ fontSize: "0.75rem" }}>{s.id}</code></td>
                  <td data-label="Title">{s.title}</td>
                  <td data-label="Author">{s.authorName ?? "—"}</td>
                  <td data-label="Status"><span className={badgeClass(s.status)}>{statusLabel(s.status)}</span></td>
                  <td data-label="Reviewers">
                    {s.assignments && s.assignments.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {s.assignments.map((a) => (
                          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span>{a.reviewer?.name ?? a.reviewer?.email ?? "assigned"}</span>
                            <span className={badgeClass(a.recommendation ?? "pending")} style={{ fontSize: "0.7rem" }}>
                              {a.recommendation ? statusLabel(a.recommendation) : "Pending"}
                            </span>
                            {a.hasAttachment && a.reviewId && (
                              <button
                                type="button"
                                className="jida-badge info"
                                style={{ cursor: "pointer", border: "none", fontSize: "0.7rem" }}
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
                        ))}
                      </div>
                    ) : (
                      <span className="jida-badge warning">Unassigned</span>
                    )}
                  </td>
                  <td data-label="Files">
                    <button
                      type="button"
                      className="jida-badge info"
                      style={{ cursor: "pointer", border: "none" }}
                      onClick={() =>
                        downloadFile(`/api/editor/manuscripts/${s.id}/download`, `${s.title}.pdf`)
                          .catch((e) => alert(e instanceof Error ? e.message : "Download failed"))
                      }
                    >
                      Download
                    </button>
                  </td>
                  <td data-label="Editor's Comments">
                    {s.decisions && s.decisions.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {s.decisions.map((d, i) => (
                          <div key={i}>
                            <span className={badgeClass(d.decision)} style={{ fontSize: "0.7rem" }}>{statusLabel(d.decision)}</span>
                            {" "}
                            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{d.editorName} · {d.createdAt.slice(0, 10)}</span>
                            {d.notes && <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem" }}>{d.notes}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-label="Actions">
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button type="button" className="jida-badge" style={{ cursor: "pointer", border: "none" }} onClick={() => openPanel("assign", s.id)}>Assign</button>
                      <button type="button" className="jida-badge" style={{ cursor: "pointer", border: "none" }} onClick={() => openPanel("decision", s.id)}>Decide</button>
                      <button type="button" className="jida-badge" style={{ cursor: "pointer", border: "none" }} onClick={() => openPanel("upload", s.id)}>Upload</button>
                    </div>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && !loading && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "1rem" }}>No submissions found.</td></tr>
              )}
            </tbody>
          </table>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const t = setTimeout(async () => {
      try {
        setArticles(await getPublicArticles(query || undefined));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

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

      <section className="jida-card">
        <div className="jida-section-heading">
          <div><p className="jida-section-kicker">Search</p><h2>Find Articles</h2></div>
          <span className="jida-badge info">{issues.length} issues</span>
        </div>
        <input
          className="jida-search jida-search-wide"
          placeholder="Search by title, author, or keyword…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <section className="jida-card">
        <div className="jida-section-heading">
          <div><p className="jida-section-kicker">Issues</p><h2>Journal Issues</h2></div>
        </div>
        <div className="jida-archive">
          {issues.map((issue) => (
            <article key={issue.id} className="jida-issue">
              <span>Volume {issue.volume}</span>
              <h3>Issue {issue.issue}, {issue.year}</h3>
              <p>Published {issue.publishedAt?.slice(0, 10)}</p>
              <strong>{issue.articleCount} articles</strong>
            </article>
          ))}
          {issues.length === 0 && !loading && <p style={{ padding: "1rem" }}>No issues published yet.</p>}
        </div>
      </section>

      <section className="jida-card">
        <div className="jida-section-heading">
          <div><p className="jida-section-kicker">Articles</p><h2>Published Articles</h2></div>
          <span className="jida-badge">{articles.length} results</span>
        </div>
        <div className="jida-table-wrap">
          <table className="jida-table">
            <thead>
              <tr><th>Article</th><th>Author</th><th>Issue</th><th>Keywords</th><th>Review</th></tr>
            </thead>
            <tbody>
              {articles.map((a) => {
                const authorName = [a.manuscript.author?.firstName, a.manuscript.author?.lastName]
                  .filter(Boolean)
                  .join(" ");
                return (
                <tr key={a.id}>
                  <td data-label="Article">
                    <Link href={`/archive/${a.slug}`}><strong>{a.manuscript.title}</strong></Link>
                  </td>
                  <td data-label="Author">{authorName || "—"}</td>
                  <td data-label="Issue">
                    {a.issue ? `Vol. ${a.issue.volume}, No. ${a.issue.issueNumber}` : "—"}
                  </td>
                  <td data-label="Keywords">{a.manuscript.keywords?.join(", ") ?? "—"}</td>
                  <td data-label="Review">
                    <button
                      type="button"
                      className="jida-badge info"
                      style={{ cursor: "pointer", border: "none" }}
                      onClick={() =>
                        viewFile(`/api/public/articles/${a.slug}/download`).catch((e) =>
                          alert(e instanceof Error ? e.message : "Failed to open article"),
                        )
                      }
                    >
                      Review
                    </button>
                  </td>
                </tr>
                );
              })}
              {articles.length === 0 && !loading && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>No published articles found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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
  AUTHOR:   "jida-badge info",
  REVIEWER: "jida-badge success",
  EDITOR:   "jida-badge warning",
  ADMIN:    "jida-badge danger",
};

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
    try {
      const created = await adminCreateUser({
        email:       String(fd.get("email") ?? ""),
        password:    String(fd.get("password") ?? ""),
        role:        String(fd.get("role") ?? "AUTHOR") as UserRole,
        name:        String(fd.get("name") ?? "") || undefined,
        institution: String(fd.get("institution") ?? "") || undefined,
      });
      setCreateMsg({ ok: true, text: `User "${created.email}" created as ${created.role}.` });
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
                  Role <span className="jida-required">*</span>
                  <select name="role" defaultValue="AUTHOR" required>
                    <option value="AUTHOR">Author</option>
                    <option value="REVIEWER">Reviewer</option>
                    <option value="EDITOR">Editor</option>
                  </select>
                </label>
                <label>
                  Institution
                  <input name="institution" type="text" placeholder="University or affiliation" />
                </label>
              </div>

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
                      <th>Role</th>
                      <th>Institution</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td data-label="Name">{u.name ?? "—"}</td>
                        <td data-label="Email">{u.email}</td>
                        <td data-label="Role">
                          <span className={ROLE_BADGE[u.role]}>{u.role}</span>
                        </td>
                        <td data-label="Institution">{u.institution ?? "—"}</td>
                        <td data-label="Joined">{u.createdAt?.slice(0, 10) ?? "—"}</td>
                        <td data-label="Actions">
                          <button
                            type="button"
                            className="jida-btn-danger-sm"
                            disabled={deleting === u.id}
                            onClick={() => handleDelete(u.id, u.email)}
                          >
                            {deleting === u.id ? "…" : "Remove"}
                          </button>
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
