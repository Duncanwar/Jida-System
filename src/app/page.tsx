import Link from "next/link";
import { AppHeader } from "@/features/jida/components";
import { journalIssues, manuscripts, notifications, reviewAssignments } from "@/features/jida/data";

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
  const articleCount = journalIssues.reduce((total, issue) => total + issue.articleCount, 0);
  const recentManuscripts = manuscripts.slice(0, 3);

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
            <Link href="/author">Enter Workspace</Link>
            <Link href="/archive">Browse Archive</Link>
          </div>
        </div>

        <div className="jida-home-hero-stats" aria-label="Platform statistics">
          <article>
            <strong>{journalIssues.length}</strong>
            <span>Volumes</span>
          </article>
          <article>
            <strong>{articleCount}</strong>
            <span>Articles</span>
          </article>
          <article>
            <strong>{reviewAssignments.length}</strong>
            <span>Reviewers</span>
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

        <div className="jida-home-grid">
          <section className="jida-card">
            <div className="jida-section-heading">
              <div>
                <p className="jida-section-kicker">Recent</p>
                <h2>Recent Manuscripts</h2>
              </div>
              <span className="jida-badge info">3 active</span>
            </div>

            <div className="jida-home-manuscripts">
              {recentManuscripts.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.id}</strong>
                    <p>{item.title}</p>
                  </div>
                  <span className="jida-badge">{item.status}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="jida-card">
            <div className="jida-section-heading">
              <div>
                <p className="jida-section-kicker">Activity</p>
                <h2>Email Notifications</h2>
              </div>
              <span className="jida-badge warning">Mock</span>
            </div>

            <ul className="jida-list">
              {notifications.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <footer className="jida-footer">
        <strong>JIDA System</strong>
        <nav>
          <Link href="/archive">About</Link>
          <Link href="/archive">Contact</Link>
          <Link href="/archive">Privacy</Link>
          <Link href="/archive">Terms</Link>
        </nav>
        <span>© 2026 Journal of Inter-Discourse Academia</span>
      </footer>
    </main>
  );
}