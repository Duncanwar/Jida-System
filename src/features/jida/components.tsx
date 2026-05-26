"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home" },
    { href: "/author", label: "Author" },
    { href: "/reviewer", label: "Reviewer" },
    { href: "/editor", label: "Editor" },
    { href: "/archive", label: "Archive" },
  ];

  return (
    <header className="jida-header">
      <div>
        <p className="jida-header-kicker">Journal Management</p>
        <h1>JIDA System</h1>
      </div>
      <nav>
        {links.map((link) => {
          const isActive = pathname === link.href;

          return (
            <Link key={link.href} href={link.href} className={isActive ? "active" : undefined}>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export function NotificationsPanel() {
  return (
    <section className="jida-card jida-notification-card">
      <div className="jida-section-heading">
        <div>
          <p className="jida-section-kicker">Activity</p>
          <h2>Email Notifications</h2>
        </div>
        <span className="jida-badge info">Mock</span>
      </div>
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
  const publishedCount = manuscripts.filter((item) => item.status === "Published").length;
  const revisionCount = manuscripts.filter((item) => item.status === "Revision Required").length;

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
    <section className="jida-workspace">
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Author Workspace</p>
          <h2>Manage submissions with confidence</h2>
          <p>
            Submit manuscripts, upload revisions, update your profile, and track publication
            progress from one organized dashboard.
          </p>
        </div>
        <button type="button" className="jida-btn-primary">
          New Submission
        </button>
      </div>

      <div className="jida-metrics">
        <article className="jida-metric">
          <p>Total Manuscripts</p>
          <strong>{manuscripts.length}</strong>
        </article>
        <article className="jida-metric">
          <p>Needs Revision</p>
          <strong>{revisionCount}</strong>
        </article>
        <article className="jida-metric">
          <p>Published</p>
          <strong>{publishedCount}</strong>
        </article>
      </div>

      <div className="jida-grid-two">
        <form className="jida-form">
          <div className="jida-form-header">
            <span>01</span>
            <div>
              <h3>Submit Manuscript</h3>
              <p>Provide the core article details before editorial screening.</p>
            </div>
          </div>
          <label>
            Title
            <input placeholder="Enter manuscript title" />
          </label>
          <label>
            Author names
            <input placeholder="Full names" />
          </label>
          <label>
            Abstract
            <textarea placeholder="Briefly summarize the manuscript" rows={4} />
          </label>
          <label>
            Keywords
            <input placeholder="Comma separated keywords" />
          </label>
          <label>
            References
            <textarea placeholder="Paste references or citation list" rows={4} />
          </label>
          <label>
            File format
            <select defaultValue="">
              <option value="" disabled>
                Select file format
              </option>
              <option value="PDF">PDF</option>
              <option value="DOCX">DOCX</option>
            </select>
          </label>
          <button type="button" className="jida-btn-primary">
            Submit Manuscript
          </button>
        </form>

        <form className="jida-form">
          <div className="jida-form-header">
            <span>02</span>
            <div>
              <h3>Revision & Profile</h3>
              <p>Respond to reviewer feedback and keep author information current.</p>
            </div>
          </div>
          <label>
            Manuscript ID
            <input placeholder="e.g. MS-2026-002" />
          </label>
          <label>
            Revision note
            <textarea placeholder="Summarize changes made for reviewers" rows={4} />
          </label>
          <button type="button" className="jida-btn-primary">
            Upload Revised Version
          </button>
          <div className="jida-form-divider" />
          <label>
            Display name
            <input placeholder="Author display name" />
          </label>
          <label>
            Institution
            <input placeholder="Institution or affiliation" />
          </label>
          <div className="jida-action-row">
            <button type="button" className="jida-btn-primary">
              Update Profile
            </button>
            <button type="button" className="jida-btn-secondary">
              Reset Password
            </button>
          </div>
        </form>
      </div>

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Tracking</p>
            <h2>Previous Manuscripts</h2>
          </div>
          <span className="jida-badge">{filtered.length} records</span>
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

        <div className="jida-table-wrap">
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
                  <td data-label="Manuscript">
                    <strong>{item.id}</strong>
                    <span>{item.title}</span>
                  </td>
                  <td data-label="Status">
                    <span className={badgeClass(item.status)}>{item.status}</span>
                  </td>
                  <td data-label="Submission Deadline">{item.submissionDeadline}</td>
                  <td data-label="Published Access">
                    {item.status === "Published" ? "Download available" : "Not published yet"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export function ReviewerWorkspace() {
  const pendingCount = reviewAssignments.filter((item) => item.progress !== "Finished Review").length;
  const completedCount = reviewAssignments.filter((item) => item.progress === "Finished Review").length;

  return (
    <section className="jida-workspace">
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Reviewer Workspace</p>
          <h2>Review assignments with clarity</h2>
          <p>
            Track assigned manuscripts, submit structured evaluations, update review progress,
            and manage reviewer profile actions in one professional workspace.
          </p>
        </div>
        <button type="button" className="jida-btn-primary">
          Start Review
        </button>
      </div>

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

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Assignments</p>
            <h2>Review Queue</h2>
          </div>
          <span className="jida-badge">{reviewAssignments.length} manuscripts</span>
        </div>

        <div className="jida-table-wrap">
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
                  <td data-label="Assigned Manuscript">
                    <strong>{assignment.manuscriptId}</strong>
                    <span>{assignment.manuscriptTitle}</span>
                  </td>
                  <td data-label="Deadline">{assignment.deadline}</td>
                  <td data-label="Progress">
                    <span className={badgeClass(assignment.progress)}>{assignment.progress}</span>
                  </td>
                  <td data-label="Recommendation">
                    <span className={badgeClass(assignment.recommendation ?? "Pending")}>
                      {assignment.recommendation ?? "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
    <section className="jida-workspace">
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Editor Workspace</p>
          <h2>Coordinate editorial decisions</h2>
          <p>
            Assign reviewers, monitor submission status, record editorial decisions, and prepare
            accepted manuscripts for publication.
          </p>
        </div>
        <button type="button" className="jida-btn-primary">
          Assign Reviewer
        </button>
      </div>

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

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Submissions</p>
            <h2>Editorial Pipeline</h2>
          </div>
          <span className="jida-badge">{manuscripts.length} submissions</span>
        </div>

        <div className="jida-table-wrap">
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
                    <td data-label="Submission">
                      <strong>{item.id}</strong>
                      <span>{item.title}</span>
                    </td>
                    <td data-label="Author">{item.authorName}</td>
                    <td data-label="Status">
                      <span className={badgeClass(item.status)}>{item.status}</span>
                    </td>
                    <td data-label="Current Reviewer">
                      <span className={badgeClass(assignment?.reviewerName ? "Assigned" : "Not assigned")}>
                        {assignment?.reviewerName ?? "Not assigned"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
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
    <section className="jida-workspace">
      <div className="jida-page-title">
        <div>
          <p className="jida-section-kicker">Public Archive</p>
          <h2>Discover published research</h2>
          <p>
            Browse journal issues, search published articles, and access organized publication
            metadata from the JIDA digital archive.
          </p>
        </div>
        <button type="button" className="jida-btn-primary">
          Browse Issues
        </button>
      </div>

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Search</p>
            <h2>Find Articles</h2>
          </div>
          <span className="jida-badge info">{journalIssues.length} issues</span>
        </div>

        <input
          className="jida-search jida-search-wide"
          placeholder="Search by title, author, keyword, or issue..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Issues</p>
            <h2>Journal Issues</h2>
          </div>
        </div>

        <div className="jida-archive">
          {journalIssues.map((issue) => (
            <article key={issue.id} className="jida-issue">
              <span>Volume {issue.volume}</span>
              <h3>
                Issue {issue.issue}, {issue.year}
              </h3>
              <p>Published {issue.publishedAt}</p>
              <strong>{issue.articleCount} articles</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="jida-card">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Articles</p>
            <h2>Published Articles</h2>
          </div>
          <span className="jida-badge">{filtered.length} results</span>
        </div>

        <div className="jida-table-wrap">
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
                  <td data-label="Article">
                    <strong>{item.title}</strong>
                    <span>{item.id}</span>
                  </td>
                  <td data-label="Author">{item.authorName}</td>
                  <td data-label="Issue">{item.issue ?? "Pending issue"}</td>
                  <td data-label="Keywords">{item.keywords.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

