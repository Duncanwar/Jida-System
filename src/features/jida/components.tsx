"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getManuscripts,
  submitManuscript,
  submitRevision,
  patchMe,
  getAssignments,
  getReviewHistory,
  updateReviewProgress,
  submitReview,
  getEditorSubmissions,
  assignReviewers,
  makeDecision,
  createIssue,
  publishToIssue,
  getPublicIssues,
  getPublicArticles,
  type ManuscriptSummary,
  type Assignment,
  type EditorSubmission,
  type PublicIssue,
  type PublicArticle,
  type ReviewProgress,
  type ReviewRecommendation,
} from "@/lib/api";

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

// ─── AppHeader ─────────────────────────────────────────────────────────────

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    setUserRole(localStorage.getItem("role"));
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
  }

  const isPublicPage = pathname === "/" || pathname === "/archive";
  const roleLabel = userRole
    ? userRole.charAt(0) + userRole.slice(1).toLowerCase()
    : null;

  return (
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
              <Link href="/register" className="jida-nav-ghost">Create Account</Link>
              <Link href="/login" className="jida-nav-btn">Sign In</Link>
            </>
          )}
          {isPublicPage && isLoggedIn && (
            <>
              <Link
                href={
                  userRole === "AUTHOR"
                    ? "/author"
                    : userRole === "REVIEWER"
                      ? "/reviewer"
                      : "/editor"
                }
                className="jida-nav-ghost"
              >
                My Workspace
              </Link>
              <button type="button" onClick={handleLogout} className="jida-nav-btn">
                Log out
              </button>
            </>
          )}
          {!isPublicPage && (
            <button type="button" onClick={handleLogout} className="jida-nav-btn">
              Log out
            </button>
          )}
        </nav>
      </div>
    </header>
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
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const submitRef = useRef<HTMLFormElement>(null);
  const reviseRef = useRef<HTMLFormElement>(null);

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

  async function handleProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMsg(null);
    const fd = new FormData(e.currentTarget);
    try {
      await patchMe({
        name: String(fd.get("name") ?? ""),
        institution: String(fd.get("institution") ?? ""),
      });
      setProfileMsg("Profile updated.");
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : "Update failed");
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
          <button type="button" className="jida-panel-card" onClick={() => setActivePanel("profile")}>
            <span className="jida-panel-num">03</span>
            <div className="jida-panel-info">
              <strong>Update Profile</strong>
              <p>Keep your author information current.</p>
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

      {activePanel === "profile" && (
        <div className="jida-form-panel">
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setProfileMsg(null); }}>← Back to actions</button>
          <form className="jida-form" onSubmit={handleProfile}>
            <div className="jida-form-header">
              <span>03</span>
              <div><h3>Update Profile</h3><p>Keep your author information current.</p></div>
            </div>
            {profileMsg && <p>{profileMsg}</p>}
            <label>Display name<input name="name" placeholder="Author display name" /></label>
            <label>Institution<input name="institution" placeholder="Institution or affiliation" /></label>
            <button type="submit" className="jida-btn-primary">Update Profile</button>
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
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {manuscripts.map((item) => (
                  <tr key={item.id}>
                    <td data-label="ID"><code style={{ fontSize: "0.75rem" }}>{item.id}</code></td>
                    <td data-label="Title">{item.title}</td>
                    <td data-label="Status"><span className={badgeClass(item.status)}>{statusLabel(item.status)}</span></td>
                    <td data-label="Submitted">{item.submittedAt?.slice(0, 10)}</td>
                    <td data-label="Deadline">{item.submissionDeadline?.slice(0, 10) ?? "—"}</td>
                  </tr>
                ))}
                {manuscripts.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>No manuscripts found.</td></tr>
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
    if (!id) { setProgressMsg("Enter an assignment ID"); return; }
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
    if (!id) { setReviewMsg("Enter an assignment ID"); return; }
    try {
      await submitReview(id, {
        commentsToAuthor: String(fd.get("commentsToAuthor") ?? ""),
        commentsToEditor: String(fd.get("commentsToEditor") ?? ""),
        recommendation: String(fd.get("recommendation") ?? "") as ReviewRecommendation,
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
          <button type="button" className="jida-panel-card" onClick={() => setActivePanel("review")}>
            <span className="jida-panel-num">01</span>
            <div className="jida-panel-info">
              <strong>Submit Review Evaluation</strong>
              <p>Provide structured feedback and a recommendation for the manuscript.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
          <button type="button" className="jida-panel-card" onClick={() => setActivePanel("progress")}>
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
          <form className="jida-form" onSubmit={handleReview}>
            <div className="jida-form-header">
              <span>01</span>
              <div><h3>Submit Review Evaluation</h3><p>Provide structured feedback for the manuscript.</p></div>
            </div>
            {reviewMsg && <p>{reviewMsg}</p>}
            <label>Assignment ID<input name="assignmentId" placeholder="Paste ID from queue below" required /></label>
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
            <button type="submit" className="jida-btn-primary">Submit Review</button>
          </form>
        </div>
      )}

      {activePanel === "progress" && (
        <div className="jida-form-panel">
          <button type="button" className="jida-back-btn" onClick={() => { setActivePanel(null); setProgressMsg(null); }}>← Back to actions</button>
          <form className="jida-form" onSubmit={handleProgress}>
            <div className="jida-form-header">
              <span>02</span>
              <div><h3>Update Review Progress</h3><p>Track your progress on an assigned manuscript.</p></div>
            </div>
            {progressMsg && <p>{progressMsg}</p>}
            <label>Assignment ID<input name="assignmentId" placeholder="Paste ID from queue below" required /></label>
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
            <button type="submit" className="jida-btn-primary">Update Progress</button>
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
                <th>ID</th>
                <th>Manuscript</th>
                <th>Deadline</th>
                <th>Progress</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td data-label="ID"><code style={{ fontSize: "0.75rem" }}>{a.id}</code></td>
                  <td data-label="Manuscript"><strong>{a.manuscriptId}</strong><span>{a.manuscriptTitle}</span></td>
                  <td data-label="Deadline">{a.deadline?.slice(0, 10)}</td>
                  <td data-label="Progress"><span className={badgeClass(a.progress)}>{statusLabel(a.progress)}</span></td>
                  <td data-label="Recommendation">
                    <span className={badgeClass(a.recommendation ?? "pending")}>
                      {a.recommendation ? statusLabel(a.recommendation) : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && !loading && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>No assignments found.</td></tr>
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
                <tr><th>Manuscript</th><th>Recommendation</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.manuscriptTitle ?? h.manuscriptId}</td>
                    <td><span className={badgeClass(h.recommendation ?? "pending")}>{h.recommendation ? statusLabel(h.recommendation) : "—"}</span></td>
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
    if (!manuscriptId || !decision) { setDecisionMsg("All fields required"); return; }
    try {
      await makeDecision(manuscriptId, decision);
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
    try {
      const { id: issueId } = await createIssue({ volume, issue, year });
      await publishToIssue(issueId, manuscriptId);
      setIssueMsg("Manuscript published to issue.");
      fetchSubmissions();
    } catch (err) {
      setIssueMsg(err instanceof Error ? err.message : "Publish failed");
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
          <button type="button" className="jida-panel-card" onClick={() => setActivePanel("assign")}>
            <span className="jida-panel-num">01</span>
            <div className="jida-panel-info">
              <strong>Assign Reviewer</strong>
              <p>Link a reviewer to a manuscript with a deadline.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
          <button type="button" className="jida-panel-card" onClick={() => setActivePanel("decision")}>
            <span className="jida-panel-num">02</span>
            <div className="jida-panel-info">
              <strong>Editorial Decision</strong>
              <p>Accept, reject, or request revision on a submission.</p>
            </div>
            <span className="jida-panel-arrow">→</span>
          </button>
          <button type="button" className="jida-panel-card" onClick={() => setActivePanel("publish")}>
            <span className="jida-panel-num">03</span>
            <div className="jida-panel-info">
              <strong>Publish to Issue</strong>
              <p>Create an issue and publish an accepted manuscript.</p>
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
            <label>Manuscript ID<input name="manuscriptId" placeholder="Paste ID from pipeline below" required /></label>
            <label>Reviewer ID<input name="reviewerId" placeholder="Reviewer account ID" required /></label>
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
            <label>Manuscript ID<input name="manuscriptId" placeholder="Paste ID from pipeline below" required /></label>
            <label>
              Decision
              <select name="decision" defaultValue="">
                <option value="" disabled>Select decision</option>
                <option value="ACCEPT">Accept</option>
                <option value="REJECT">Reject</option>
                <option value="REQUEST_REVISION">Request Revision</option>
              </select>
            </label>
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
            <label>Manuscript ID<input name="manuscriptId" placeholder="Accepted manuscript ID" required /></label>
            <label>Volume<input type="number" name="volume" placeholder="e.g. 12" min={1} required /></label>
            <label>Issue number<input type="number" name="issueNum" placeholder="e.g. 2" min={1} required /></label>
            <label>Year<input type="number" name="year" defaultValue={new Date().getFullYear()} min={2000} required /></label>
            <button type="submit" className="jida-btn-primary">Publish to Journal Issue</button>
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
                    {s.assignments && s.assignments.length > 0
                      ? s.assignments.map((a) => a.reviewer?.email ?? a.reviewer?.id ?? "assigned").join(", ")
                      : <span className="jida-badge warning">Unassigned</span>}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && !loading && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>No submissions found.</td></tr>
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
  const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
              <tr><th>Article</th><th>Author</th><th>Issue</th><th>Keywords</th><th>Download</th></tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td data-label="Article"><strong>{a.title}</strong><span>{a.id}</span></td>
                  <td data-label="Author">{a.authorName ?? "—"}</td>
                  <td data-label="Issue">{a.issue ?? "—"}</td>
                  <td data-label="Keywords">{a.keywords?.join(", ") ?? "—"}</td>
                  <td data-label="Download">
                    <a
                      href={`${BASE}/api/public/articles/${a.slug}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="jida-badge info"
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
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
