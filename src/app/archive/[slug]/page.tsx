import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader, AuthorHover, ReviewArticleButton } from "@/features/jida/components";
import { formatIssueTitle } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
/** Public origin of this site, used for the absolute URLs Scholar requires. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
    references: string | null;
    author: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      affiliation?: string | null;
    };
    coAuthors?: {
      fullName: string;
      email?: string | null;
      affiliation?: string | null;
      isCorresponding?: boolean;
    }[];
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
 *
 * Two rules drive the shape of this tag set. Every author needs their own
 * `citation_author` tag — a single tag holding a joined list is read as one
 * person with a very long name, which is how co-authors disappear from an
 * index. And every URL must be absolute, because Scholar resolves them from its
 * own crawler rather than relative to this page.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return { title: "Article not found — JIDA" };

  const { manuscript, issue } = article;

  // One entry per author, lead author first — Next renders a repeated meta tag
  // for each element of the array.
  const authorTags = [
    [manuscript.author.firstName, manuscript.author.lastName].filter(Boolean).join(" "),
    ...(manuscript.coAuthors ?? []).map((c) => c.fullName),
  ]
    .map((n) => n.trim())
    .filter(Boolean);

  const scholarTags: Record<string, string | string[]> = article.scholarReady
    ? {
        citation_title: manuscript.title,
        citation_author: authorTags.length ? authorTags : ["Unknown"],
        citation_publication_date: article.publishedAt.slice(0, 10).replace(/-/g, "/"),
        citation_online_date: article.publishedAt.slice(0, 10).replace(/-/g, "/"),
        citation_journal_title: "Journal of Inter-Discourse Academia",
        citation_journal_abbrev: "JIDA",
        citation_publisher: "Adventist University of Central Africa",
        citation_volume: String(issue.volume),
        citation_issue: String(issue.issueNumber),
        citation_language: "en",
        citation_abstract_html_url: `${SITE}/archive/${article.slug}`,
        citation_pdf_url: `${BASE}/api/public/articles/${article.slug}/download`,
        ...(manuscript.keywords.length
          ? { citation_keywords: manuscript.keywords.join("; ") }
          : {}),
        ...(manuscript.author.affiliation
          ? { citation_author_institution: manuscript.author.affiliation }
          : {}),
      }
    : {};

  return {
    title: `${manuscript.title} — JIDA`,
    description: manuscript.abstract.slice(0, 300),
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
    [manuscript.author.firstName, manuscript.author.lastName].filter(Boolean).join(" ") ||
    "Unknown author";
  const coAuthors = manuscript.coAuthors ?? [];

  return (
    <main className="jida-shell">
      <AppHeader />
      <section className="jida-workspace">
        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">{formatIssueTitle(issue)}</p>
            <h2>{manuscript.title}</h2>
            <p>
              <AuthorHover
                author={{
                  name: authorName,
                  email: manuscript.author.email,
                  affiliation: manuscript.author.affiliation,
                  isCorresponding: true,
                }}
              >
                {authorName}
              </AuthorHover>
              {manuscript.author.affiliation ? ` — ${manuscript.author.affiliation}` : ""}
              {coAuthors.map((c, i) => (
                <span key={`${c.email}-${i}`}>
                  {", "}
                  <AuthorHover
                    author={{
                      name: c.fullName,
                      email: c.email,
                      affiliation: c.affiliation,
                      isCorresponding: c.isCorresponding,
                    }}
                  >
                    {c.fullName}
                  </AuthorHover>
                </span>
              ))}
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
