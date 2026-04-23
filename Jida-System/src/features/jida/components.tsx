"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { journalIssues, manuscripts, notifications, reviewAssignments } from "./data";
import type { ManuscriptStatus, ReviewProgress, ReviewRecommendation } from "./types";

function badgeClass(value: string) {
  const key = value.toLowerCase();
  if (key.includes("finished") || key.includes("accept") || key.includes("published")) {
    return "jida-badge success";
  }
  if (key.includes("progress") || key.includes("review")) {
    return "jida-badge info";
  }
  if (key.includes("reject")) {
    return "jida-badge danger";
  }
  if (key.includes("revision") || key.includes("pending") || key.includes("not started")) {
    return "jida-badge warning";
  }
  return "jida-badge";
}

export function AppHeader() {
  return (
    <header className="jida-header">
      <h1>JIDA System</h1>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/author">Author</Link>
        <Link href="/reviewer">Reviewer</Link>
        <Link href="/editor">Editor</Link>
        <Link href="/archive">Archive</Link>
      </nav>
    </header>
  );
}

export function NotificationsPanel() {
  return (
    <section className="jida-card">
      <h2>Email Notifications (Mock)</h2>
      <ul className="jida-list">
        {notifications.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </section>
  );
}

export function AuthorWorkspace() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ManuscriptStatus | "All">("All");

  const filtered = useMemo(
    () =>
      manuscripts.filter((item) => {
        const matchesStatus = status === "All" || item.status === status;
        const text = query.trim().toLowerCase();
        const matchesQuery =
          item.id.toLowerCase().includes(text) ||
          item.title.toLowerCase().includes(text) ||
          item.keywords.join(" ").toLowerCase().includes(text);
        return matchesStatus && matchesQuery;
      }),
    [query, status],
  );

  return (
    <section className="jida-card">
      <h2>Author Dashboard</h2>
      <p className="jida-muted">FR-A1..FR-A12 supported with dummy forms and tracking data.</p>

      <div className="jida-grid-two">
        <form className="jida-form">
          <h3>Submit Manuscript</h3>
          <input placeholder="Title" />
          <input placeholder="Full names" />
          <textarea placeholder="Abstract" rows={3} />
          <input placeholder="Keywords (comma separated)" />
          <textarea placeholder="References" rows={3} />
          <select defaultValue="">
            <option value="" disabled>
              Select file format
            </option>
            <option value="PDF">PDF</option>
            <option value="DOCX">DOCX</option>
          </select>
          <button type="button">Submit</button>
        </form>

        <form className="jida-form">
          <h3>Revision Upload & Profile</h3>
          <input placeholder="Manuscript ID" />
          <textarea placeholder="Revision note" rows={3} />
          <button type="button">Upload Revised Version</button>
          <hr />
          <input placeholder="Display name" />
          <input placeholder="Institution" />
          <button type="button">Update Profile</button>
          <button type="button">Reset Password</button>
        </form>
      </div>

      <div className="jida-toolbar">
        <input
          placeholder="Search previous manuscripts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as ManuscriptStatus | "All")}>
          <option value="All">All statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Under Review">Under Review</option>
          <option value="Accepted">Accepted</option>
          <option value="Rejected">Rejected</option>
          <option value="Revision Required">Revision Required</option>
          <option value="Published">Published</option>
        </select>
      </div>

      <table className="jida-table">
        <thead>
          <tr>
            <th>Manuscript</th>
            <th>Status</th>
            <th>Submission Deadline</th>
            <th>Published Access</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>
                {item.id} - {item.title}
              </td>
              <td>{item.status}</td>
              <td>{item.submissionDeadline}</td>
              <td>{item.status === "Published" ? "Download available" : "Not published yet"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function ReviewerWorkspace() {
  const pendingCount = reviewAssignments.filter((item) => item.progress !== "Finished Review").length;
  const completedCount = reviewAssignments.filter((item) => item.progress === "Finished Review").length;

  return (
    <section className="jida-card">
      <h2>Reviewer Dashboard</h2>
      <p className="jida-muted">FR-R1..FR-R12 with assignments, progress, feedback, and history.</p>
      <div className="jida-metrics">
        <article className="jida-metric">
          <p>Assigned Reviews</p>
          <strong>{reviewAssignments.length}</strong>
        </article>
        <article className="jida-metric">
          <p>Pending</p>
          <strong>{pendingCount}</strong>
        </article>
        <article className="jida-metric">
          <p>Completed</p>
          <strong>{completedCount}</strong>
        </article>
      </div>

      <div className="jida-grid-two">
        <form className="jida-form">
          <h3>Structured Review Evaluation</h3>
          <input placeholder="Manuscript ID" />
          <textarea rows={3} placeholder="Comments to Author" />
          <textarea rows={3} placeholder="Comments to Editor" />
          <select defaultValue="">
            <option value="" disabled>
              Recommendation
            </option>
            {(["Accept", "Minor Revision", "Major Revision", "Reject"] as ReviewRecommendation[]).map(
              (option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ),
            )}
          </select>
          <button type="button" className="jida-btn-primary">
            Submit Review
          </button>
        </form>

        <form className="jida-form">
          <h3>Track Review Progress</h3>
          <input placeholder="Manuscript ID" />
          <select defaultValue="">
            <option value="" disabled>
              Review progress
            </option>
            {(["Not started", "Begin review", "In Progress", "Finished Review"] as ReviewProgress[]).map(
              (step) => (
                <option key={step} value={step}>
                  {step}
                </option>
              ),
            )}
          </select>
          <input type="date" />
          <button type="button" className="jida-btn-primary">
            Update Progress
          </button>
          <div className="jida-action-row">
            <button type="button" className="jida-btn-secondary">
              Reset Password
            </button>
            <button type="button" className="jida-btn-secondary">
              Update Profile
            </button>
          </div>
        </form>
      </div>

      <table className="jida-table">
        <thead>
          <tr>
            <th>Assigned Manuscript</th>
            <th>Deadline</th>
            <th>Progress</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {reviewAssignments.map((assignment) => (
            <tr key={assignment.manuscriptId}>
              <td>
                {assignment.manuscriptId} - {assignment.manuscriptTitle}
              </td>
              <td>{assignment.deadline}</td>
              <td>
                <span className={badgeClass(assignment.progress)}>{assignment.progress}</span>
              </td>
              <td>
                <span className={badgeClass(assignment.recommendation ?? "Pending")}>
                  {assignment.recommendation ?? "Pending"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function EditorWorkspace() {
  const unassignedCount = manuscripts.filter(
    (item) => !reviewAssignments.some((entry) => entry.manuscriptId === item.id),
  ).length;
  const decisionPendingCount = manuscripts.filter(
    (item) => item.status === "Under Review" || item.status === "Revision Required",
  ).length;

  return (
    <section className="jida-card">
      <h2>Editor Dashboard</h2>
      <p className="jida-muted">FR-E1..FR-E12 with reviewer assignment, decisions, and publishing.</p>
      <div className="jida-metrics">
        <article className="jida-metric">
          <p>Total Submissions</p>
          <strong>{manuscripts.length}</strong>
        </article>
        <article className="jida-metric">
          <p>Unassigned</p>
          <strong>{unassignedCount}</strong>
        </article>
        <article className="jida-metric">
          <p>Pending Decisions</p>
          <strong>{decisionPendingCount}</strong>
        </article>
      </div>

      <div className="jida-grid-two">
        <form className="jida-form">
          <h3>Assign Reviewer</h3>
          <input placeholder="Manuscript ID" />
          <input placeholder="Reviewer email" />
          <input type="date" />
          <button type="button" className="jida-btn-primary">
            Assign
          </button>
        </form>

        <form className="jida-form">
          <h3>Editorial Decision & Publication</h3>
          <input placeholder="Manuscript ID" />
          <select defaultValue="">
            <option value="" disabled>
              Editorial decision
            </option>
            <option value="accept">Accept</option>
            <option value="reject">Reject</option>
            <option value="revision">Request Revision</option>
          </select>
          <input placeholder="Issue (e.g. Vol 12, Issue 2)" />
          <button type="button" className="jida-btn-primary">
            Save Decision
          </button>
          <button type="button" className="jida-btn-secondary">
            Publish to Journal Issue
          </button>
          <button type="button" className="jida-btn-secondary">
            Export to Google Scholar
          </button>
          <div className="jida-action-row">
            <button type="button" className="jida-btn-secondary">
              Reset Password
            </button>
            <button type="button" className="jida-btn-secondary">
              Update Profile
            </button>
          </div>
        </form>
      </div>

      <table className="jida-table">
        <thead>
          <tr>
            <th>Submission</th>
            <th>Author</th>
            <th>Status</th>
            <th>Current Reviewer</th>
          </tr>
        </thead>
        <tbody>
          {manuscripts.map((item) => {
            const assignment = reviewAssignments.find((entry) => entry.manuscriptId === item.id);
            return (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.authorName}</td>
                <td>
                  <span className={badgeClass(item.status)}>{item.status}</span>
                </td>
                <td>
                  <span className={badgeClass(assignment?.reviewerName ? "Assigned" : "Not assigned")}>
                    {assignment?.reviewerName ?? "Not assigned"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function ArchiveWorkspace() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      manuscripts.filter((item) => {
        if (item.status !== "Published") {
          return false;
        }
        const text = query.trim().toLowerCase();
        return (
          item.title.toLowerCase().includes(text) ||
          item.authorName.toLowerCase().includes(text) ||
          item.keywords.join(" ").toLowerCase().includes(text) ||
          (item.issue ?? "").toLowerCase().includes(text)
        );
      }),
    [query],
  );

  return (
    <section className="jida-card">
      <h2>Public Archive & Discovery</h2>
      <p className="jida-muted">UI-05, search/filter, and indexing-friendly metadata showcase.</p>

      <input
        className="jida-search"
        placeholder="Search by title, author, keyword, issue..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="jida-grid-two">
        {journalIssues.map((issue) => (
          <article key={issue.id} className="jida-issue">
            <h3>
              Volume {issue.volume}, Issue {issue.issue} ({issue.year})
            </h3>
            <p>Published: {issue.publishedAt}</p>
            <p>Articles: {issue.articleCount}</p>
          </article>
        ))}
      </div>

      <table className="jida-table">
        <thead>
          <tr>
            <th>Article</th>
            <th>Author</th>
            <th>Issue</th>
            <th>Keywords</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{item.authorName}</td>
              <td>{item.issue ?? "Pending issue"}</td>
              <td>{item.keywords.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

