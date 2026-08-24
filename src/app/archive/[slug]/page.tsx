import type { Metadata } from "next";
import Link from "next/link";
import {
  AppHeader,
  AuthorHover,
  ReviewArticleButton,
  ArticleCiteShare,
} from "@/features/jida/components";
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

type RelatedArticle = {
  id: string;
  slug: string;
  publishedAt: string;
  manuscript: {
    title: string;
    author?: { firstName?: string | null; lastName?: string | null } | null;
    coAuthors?: { fullName: string }[];
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

/** Other articles published in the same issue — an honest, data-backed stand-in
 * for the "Related research" sidebar on a Taylor & Francis article page. JIDA
 * has no citation graph or recommendation engine, so "more from this issue"
 * is the real relationship available to surface. */
async function fetchIssueSiblings(
  issue: PublicArticleDetail["issue"],
  excludeId: string,
): Promise<RelatedArticle[]> {
  try {
    const res = await fetch(`${BASE}/api/public/issues`, { cache: "no-store" });
    if (!res.ok) return [];
    const issues = (await res.json()) as {
      volume: number;
      issueNumber: number;
      year: number;
      publications?: RelatedArticle[];
    }[];
    const match = issues.find(
      (i) => i.volume === issue.volume && i.issueNumber === issue.issueNumber && i.year === issue.year,
    );
    return (match?.publications ?? []).filter((p) => p.id !== excludeId);
  } catch {
    return [];
  }
}

/** "Smith, Doe & Lee" — an ampersand before the last name once there are two
 * or more authors, a comma-only list otherwise. */
function joinAuthors(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** "Lastname, F., Lastname, F. (Year). Title. Journal, Vol(Issue)." — built
 * only from fields the record actually carries, never a fabricated DOI or
 * page range. */
function buildCitation(article: PublicArticleDetail): string {
  const { manuscript, issue, publishedAt } = article;
  const year = new Date(publishedAt).getFullYear();

  const leadInitial = manuscript.author.firstName?.trim()?.[0];
  const lead = manuscript.author.lastName
    ? `${manuscript.author.lastName}${leadInitial ? `, ${leadInitial}.` : ""}`
    : null;
  const coAuthorNames = (manuscript.coAuthors ?? []).map((c) => c.fullName).filter(Boolean);
  const authors = [lead, ...coAuthorNames].filter(Boolean).join(", ") || "Unknown author";

  return `${authors} (${year}). ${manuscript.title}. Journal of Inter-Discourse Academia, ${issue.volume}(${issue.issueNumber}).`;
}

/** Splits a freeform references blob into individual entries. Authors paste
 * this straight from a source document with its original line wraps intact —
 * not one reference per line — so a plain newline split cuts entries in
 * half. Entries are detected instead by the APA "Name, I. (Year)" pattern
 * that starts each one. Text with no such pattern (or only one) is left as
 * a single entry rather than guessed at. */
function splitReferences(raw: string): string[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const nameInitials = "[A-Za-zÀ-ÖØ-öø-ÿ'’.\\-]+,\\s(?:[A-Z]\\.\\s?){1,3}";
  const boundary = new RegExp(
    `[A-Z]${nameInitials}(?:(?:,\\s?&\\s?|,\\s?and\\s?)[A-Z]${nameInitials})*\\(\\d{4}[a-z]?\\)`,
    "g",
  );

  const starts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(text))) starts.push(match.index);

  if (starts.length < 2) return [text];

  return starts.map((start, i) => text.slice(start, starts[i + 1] ?? text.length).trim());
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
  const relatedArticles = await fetchIssueSiblings(issue, article.id);
  const referenceEntries = splitReferences(manuscript.references ?? "");
  const permalink = `${SITE}/archive/${article.slug}`;

  return (
    <main className="jida-shell">
      <AppHeader />

      <nav className="jida-article-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>›</span>
        <Link href="/archive">Archive</Link>
        <span>›</span>
        <span>{formatIssueTitle(issue)}</span>
        <span>›</span>
        <span className="jida-article-breadcrumb-current">{manuscript.title}</span>
      </nav>

      <div className="jida-article-tabs">
        <a href="#abstract" className="jida-article-tab active">Full Article</a>
        <a href="#references" className="jida-article-tab">References</a>
      </div>

      <section className="jida-workspace jida-article-workspace">
        <div className="jida-article-layout">
          <aside className="jida-article-toc" aria-label="On this page">
            <h3>On this page</h3>
            <a href="#abstract">Abstract</a>
            {manuscript.keywords.length > 0 && <a href="#abstract">Keywords</a>}
            <a href="#references">References</a>
          </aside>

          <div className="jida-article-main">
            <header className="jida-article-header">
              <p className="jida-section-kicker">Research Article</p>
              <h1 className="jida-article-title">{manuscript.title}</h1>

              <p className="jida-article-byline">
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

              <p className="jida-article-meta">
                Published online: {article.publishedAt.slice(0, 10)} · {formatIssueTitle(issue)}
              </p>

              <ArticleCiteShare citation={buildCitation(article)} url={permalink} />

              <div className="jida-article-header-buttons">
                <ReviewArticleButton slug={article.slug} />
                <Link href="/archive" className="jida-nav-ghost">Back to archive</Link>
              </div>
            </header>

            <section id="abstract" className="jida-card jida-article-section">
              <h2 className="jida-article-section-title">Abstract</h2>
              <p className="jida-article-abstract">{manuscript.abstract}</p>

              {manuscript.keywords.length > 0 && (
                <div className="jida-article-keywords">
                  <p className="jida-section-kicker">Keywords</p>
                  <div className="jida-article-keyword-list">
                    {manuscript.keywords.map((kw) => (
                      <Link
                        key={kw}
                        href={`/archive/advanced-search?keyword=${encodeURIComponent(kw)}`}
                        className="jida-keyword-pill"
                      >
                        {kw}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section id="references" className="jida-card jida-article-section">
              <h2 className="jida-article-section-title">References</h2>
              {referenceEntries.length > 0 ? (
                <ol className="jida-reference-list">
                  {referenceEntries.map((entry, i) => (
                    <li key={i}>
                      <p>{entry}</p>
                      <a
                        href={`https://scholar.google.com/scholar?q=${encodeURIComponent(entry)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="jida-reference-scholar-link"
                      >
                        Google Scholar
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="jida-article-empty-note">No references listed for this article.</p>
              )}
            </section>
          </div>

          <aside className="jida-article-related" aria-label="More in this issue">
            <h3>More in this issue</h3>
            {relatedArticles.length > 0 ? (
              <ul>
                {relatedArticles.slice(0, 6).map((a) => {
                  const names = [
                    [a.manuscript.author?.firstName, a.manuscript.author?.lastName]
                      .filter(Boolean)
                      .join(" "),
                    ...(a.manuscript.coAuthors ?? []).map((c) => c.fullName),
                  ].filter(Boolean);
                  return (
                    <li key={a.id}>
                      <Link href={`/archive/${a.slug}`}>{a.manuscript.title}</Link>
                      {names.length > 0 && (
                        <span className="jida-article-related-author">{joinAuthors(names)}</span>
                      )}
                      <time className="jida-article-related-date" dateTime={a.publishedAt}>
                        Published Online: {a.publishedAt.slice(0, 10)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="jida-article-empty-note">No other articles in this issue yet.</p>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
