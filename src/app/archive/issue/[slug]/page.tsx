import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader, PublicAuthorLine } from "@/features/jida/components";
import { formatIssueTitle, type PublicIssue } from "@/lib/api";
import { fetchPublishedIssues, issueSlug, sortIssues } from "@/lib/public-content";

/**
 * One published issue and its table of contents.
 *
 * Rendered on the server, which is the point of it: Google Scholar's crawler
 * does not run JavaScript, and its inclusion guidelines ask for a browse path
 * organised by volume and issue. The interactive archive fetches on the client
 * and is invisible to that crawler, so this is the route from the site to every
 * article. It is also a normal thing for a reader to want — the contents of an
 * issue, the way it appears in print.
 */
async function findIssue(slug: string): Promise<PublicIssue | null> {
  const issues = sortIssues(await fetchPublishedIssues());
  return issues.find((i) => issueSlug(i) === slug) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const issue = await findIssue(slug);
  if (!issue) return { title: "Issue not found — JIDA" };

  const label = formatIssueTitle(issue);
  const count = issue.publications?.length ?? 0;
  return {
    title: `${label} — JIDA`,
    description: `${label} of the Journal of Inter-Discourse Academia — ${count} article${count === 1 ? "" : "s"}, free to read and download.`,
  };
}

export default async function IssuePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const issue = await findIssue(slug);
  if (!issue) notFound();

  const articles = issue.publications ?? [];

  return (
    <main className="jida-shell">
      <AppHeader />
      <section className="jida-workspace">
        <nav className="jida-article-breadcrumb" aria-label="Breadcrumb">
          <Link href="/archive">Archive</Link>
          <span aria-hidden="true">›</span>
          <span className="jida-article-breadcrumb-current">{formatIssueTitle(issue)}</span>
        </nav>

        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">
              {issue.specialIssue ? "Special Issue" : "Published Issue"}
            </p>
            <h2>{formatIssueTitle(issue)}</h2>
            <p>
              {issue.title?.trim() ? `${issue.title.trim()} — ` : ""}
              {articles.length} article{articles.length === 1 ? "" : "s"}, free to read and
              download.
            </p>
          </div>
        </div>

        <section className="jida-card">
          <div className="jida-section-heading">
            <div><p className="jida-section-kicker">Contents</p><h2>Articles in this issue</h2></div>
          </div>
          {articles.length === 0 ? (
            <p className="jida-queue-empty">No articles have been published in this issue yet.</p>
          ) : (
            <ol className="jida-issue-contents">
              {articles.map((pub) => (
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
          )}
        </section>
      </section>
    </main>
  );
}
