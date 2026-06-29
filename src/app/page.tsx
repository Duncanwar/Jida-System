"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/features/jida/components";
import { getPublicIssues, getPublicArticles, type PublicIssue, type PublicArticle } from "@/lib/api";

const workspaceCards = [
  {
    href: "/author",
    label: "Author Workspace",
    description: "Submit manuscripts, upload revisions, and track publication status.",
    action: "Enter",
    tone: "blue",
  },
  {
    href: "/reviewer",
    label: "Reviewer Workspace",
    description: "Access assigned manuscripts, submit reviews, and track your progress.",
    action: "Enter",
    tone: "green",
  },
  {
    href: "/editor",
    label: "Editor Workspace",
    description: "Manage submissions, assign reviewers, and approve final publications.",
    action: "Enter",
    tone: "gold",
  },
  {
    href: "/archive",
    label: "Public Archive",
    description: "Browse and download all published articles across all volumes.",
    action: "Browse",
    tone: "blue",
  },
];

export default function Home() {
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [articles, setArticles] = useState<PublicArticle[]>([]);

  useEffect(() => {
    getPublicIssues().then(setIssues).catch(() => {});
    getPublicArticles().then(setArticles).catch(() => {});
  }, []);

  const articleCount = issues.reduce((total, issue) => total + issue.articleCount, 0);

  return (
    <main className="jida-shell">
      <AppHeader />

      <section className="jida-home-hero">
        <div className="jida-home-hero-copy">
          <span className="jida-home-pill">Journal of Inter-Discourse Academia</span>
          <h2>
            Advancing <span>scholarship</span> across disciplines
          </h2>
          <p>
            A digital platform for modular role workspaces, searchable publication archive,
            revision tracking, reviewer progress, and editorial publishing flow.
          </p>
          <div className="jida-home-actions">
            <Link href="/login">Sign In</Link>
            <Link href="/archive">Browse Archive</Link>
          </div>
        </div>

        <div className="jida-home-hero-stats" aria-label="Platform statistics">
          <article>
            <strong>{issues.length}</strong>
            <span>Volumes</span>
          </article>
          <article>
            <strong>{articleCount}</strong>
            <span>Articles</span>
          </article>
          <article>
            <strong>{articles.length}</strong>
            <span>Published</span>
          </article>
        </div>
      </section>

      <section className="jida-home-content">
        <div className="jida-section-heading">
          <div>
            <p className="jida-section-kicker">Workspaces</p>
            <h2>Choose your role</h2>
          </div>
        </div>

        <div className="jida-home-workspaces">
          {workspaceCards.map((card) => (
            <article key={card.href} className="jida-home-workspace-card">
              <span className={`jida-home-icon ${card.tone}`}>{card.label.charAt(0)}</span>
              <h3>{card.label}</h3>
              <p>{card.description}</p>
              <Link href={card.href} className={`jida-home-card-action ${card.tone}`}>
                {card.action}
              </Link>
            </article>
          ))}
        </div>

        {articles.length > 0 && (
          <section className="jida-card">
            <div className="jida-section-heading">
              <div>
                <p className="jida-section-kicker">Recent</p>
                <h2>Latest Published Articles</h2>
              </div>
              <span className="jida-badge info">{articles.length} total</span>
            </div>
            <div className="jida-home-manuscripts">
              {articles.slice(0, 3).map((a) => (
                <article key={a.id}>
                  <div>
                    <strong>{a.authorName ?? "Unknown"}</strong>
                    <p>{a.title}</p>
                  </div>
                  <span className="jida-badge success">Published</span>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>

      <footer className="jida-footer">
        <strong>JIDA System</strong>
        <nav>
          <Link href="/archive">Archive</Link>
          <Link href="/login">Sign In</Link>
          <Link href="/register">Register</Link>
        </nav>
        <span>© {new Date().getFullYear()} Journal of Inter-Discourse Academia</span>
      </footer>
    </main>
  );
}
