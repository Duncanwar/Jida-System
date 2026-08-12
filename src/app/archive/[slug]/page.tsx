import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader, ReviewArticleButton } from "@/features/jida/components";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type PublicArticleDetail = {
  id: string;
  slug: string;
  scholarReady: boolean;
  publishedAt: string;
  issue: { volume: number; issueNumber: number; year: number; title?: string | null };
  manuscript: {
    id: string;
    title: string;
    abstract: string;
    keywords: string[];
    references: string;
    author: { firstName?: string | null; lastName?: string | null; affiliation?: string | null };
  };
};

async function fetchArticle(slug: string): Promise<PublicArticleDetail | null> {
  try {
    const res = await fetch(`${BASE}/api/public/articles/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicArticleDetail;
  } catch {
    return null;
  }
}

/**
 * FR-E12 / SRS §1.2 (indexing services) — Google Scholar discovers articles via
 * Highwire Press "citation_*" meta tags rendered on the public article page.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return { title: "Article not found — JIDA" };

  const authorName = [article.manuscript.author.firstName, article.manuscript.author.lastName]
    .filter(Boolean)
    .join(" ");

  const scholarTags: Record<string, string> = article.scholarReady
    ? {
        citation_title: article.manuscript.title,
        citation_author: authorName || "Unknown",
        citation_publication_date: article.publishedAt.slice(0, 10).replace(/-/g, "/"),
        citation_journal_title: "Journal of Inter-Discourse Academia",
        citation_volume: String(article.issue.volume),
        citation_issue: String(article.issue.issueNumber),
        citation_pdf_url: `${BASE}/api/public/articles/${article.slug}/download`,
        citation_abstract_html_url: `/archive/${article.slug}`,
        citation_keywords: article.manuscript.keywords.join("; "),
      }
    : {};

  return {
    title: `${article.manuscript.title} — JIDA`,
    description: article.manuscript.abstract.slice(0, 300),
    other: scholarTags,
  };
}

export default async function ArticlePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = await fetchArticle(slug);

  if (!article) {
    return (
      <main className="jida-shell">
        <AppHeader />
        <section className="jida-workspace">
          <div className="jida-card" style={{ padding: "2rem", textAlign: "center" }}>
            <h2>Article not found</h2>
            <p>The article you are looking for does not exist or has been removed.</p>
            <Link href="/archive" className="jida-nav-btn">Back to archive</Link>
          </div>
        </section>
      </main>
    );
  }

  const { manuscript, issue } = article;
  const authorName =
    [manuscript.author.firstName, manuscript.author.lastName].filter(Boolean).join(" ") || "Unknown author";

  return (
    <main className="jida-shell">
      <AppHeader />
      <section className="jida-workspace">
        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">
              Volume {issue.volume}, Issue {issue.issueNumber} · {issue.year}
            </p>
            <h2>{manuscript.title}</h2>
            <p>
              {authorName}
              {manuscript.author.affiliation ? ` — ${manuscript.author.affiliation}` : ""}
            </p>
          </div>
        </div>

        <section className="jida-card" style={{ padding: "1.5rem" }}>
          <h3>Abstract</h3>
          <p style={{ marginTop: "0.5rem", lineHeight: 1.7 }}>{manuscript.abstract}</p>

          {manuscript.keywords.length > 0 && (
            <p style={{ marginTop: "1rem" }}>
              <strong>Keywords:</strong> {manuscript.keywords.join(", ")}
            </p>
          )}

          <p style={{ marginTop: "0.5rem" }}>
            <strong>Published:</strong> {article.publishedAt.slice(0, 10)}
          </p>

          <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem" }}>
            <ReviewArticleButton slug={article.slug} />
            <Link href="/archive" className="jida-nav-ghost">Back to archive</Link>
          </div>
        </section>

        {manuscript.references && (
          <section className="jida-card" style={{ padding: "1.5rem" }}>
            <h3>References</h3>
            <p style={{ whiteSpace: "pre-wrap", marginTop: "0.5rem", lineHeight: 1.7 }}>
              {manuscript.references}
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
