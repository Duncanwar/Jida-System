"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/features/jida/components";
import { getPublicArticles, getPublicIssues, type PublicArticle, type PublicIssue } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [query, setQuery] = useState("");
  const [keyword, setKeyword] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPublicIssues(), getPublicArticles()])
      .then(([publicIssues, publicArticles]) => {
        setIssues(publicIssues);
        setArticles(publicArticles);
      })
      .catch(() => setError("Publication updates are temporarily unavailable."))
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (keyword) params.set("keyword", keyword);
    router.push(`/archive${params.toString() ? `?${params}` : ""}`);
  }

  // A volume can carry several issues, so the two counts differ: distinct
  // volume numbers, and issues published overall.
  const volumeCount = new Set(issues.map((i) => i.volume)).size;
  const issueCount = issues.length;

  return (
    <main className="jida-shell">
      <AppHeader />

      <section className="jida-home-hero">
        <div className="jida-home-hero-copy">
          <p className="jida-home-hero-eyebrow">
            Journal of Inter-Discourse Academia
          </p>
          <h2>
            Advancing <span>scholarship</span> across disciplines
          </h2>
          <p>
            A peer-reviewed digital platform for manuscript submission,
            structured editorial review, revision tracking, and publication —
            built for authors, reviewers, and editors.
          </p>
          <div className="jida-home-actions">
            <Link href="/login">Sign In</Link>
            <Link href="/archive">Browse Archive</Link>
          </div>
        </div>

        <div className="jida-home-hero-stats" aria-label="Platform statistics">
          <article>
            <strong>{volumeCount}</strong>
            <span className="jida-stat-label">VOLUMES</span>
          </article>
          <article>
            <strong>{issueCount}</strong>
            <span className="jida-stat-label">ISSUES</span>
          </article>
        </div>
      </section>

      <section className="jida-home-search" aria-labelledby="home-search-title">
        <div className="jida-home-search-copy">
          <p className="jida-section-kicker">Research discovery</p>
          <h2 id="home-search-title">Find research that moves the conversation forward</h2>
          <p>Search published JIDA articles by title, author, or keyword.</p>
        </div>
        <form className="jida-home-search-form" onSubmit={handleSearch}>
          <label htmlFor="home-article-search">Search the JIDA archive</label>
          <div className="jida-home-search-row">
            <input
              id="home-article-search"
              type="search"
              placeholder="Search articles, authors, or topics"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit">Search</button>
          </div>
          <button
            type="button"
            className="jida-advanced-toggle"
            onClick={() => setShowAdvanced((visible) => !visible)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "Hide advanced search" : "Advanced search"}
          </button>
          {showAdvanced && (
            <div className="jida-home-advanced">
              <label htmlFor="home-keyword-search">Keyword</label>
              <input
                id="home-keyword-search"
                type="text"
                placeholder="e.g. education, policy, technology"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>
          )}
        </form>
      </section>

      <section className="jida-home-news" aria-labelledby="home-news-title">
        <div className="jida-home-section-heading">
          <div>
            <p className="jida-section-kicker">From the archive</p>
            <h2 id="home-news-title">Latest articles and publication news</h2>
          </div>
          <Link href="/archive">View all publications</Link>
        </div>
        {loading && <p className="jida-home-state">Loading publication updates...</p>}
        {error && <p className="jida-home-state jida-home-state-error">{error}</p>}
        {!loading && !error && articles.length === 0 && (
          <p className="jida-home-state">New publications will appear here.</p>
        )}
        {!loading && !error && articles.length > 0 && (
          <div className="jida-home-news-grid">
            {articles
              .slice()
              .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
              .slice(0, 3)
              .map((article) => (
                <article key={article.id} className="jida-home-news-card">
                  <p className="jida-home-news-meta">
                    {article.issue ? `Volume ${article.issue.volume}, Issue ${article.issue.issueNumber}` : "JIDA publication"}
                  </p>
                  <h3><Link href={`/archive/${article.slug}`}>{article.manuscript.title}</Link></h3>
                  <p>{article.manuscript.abstract || "Read the latest peer-reviewed research from JIDA."}</p>
                  <time dateTime={article.publishedAt}>
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(article.publishedAt))}
                  </time>
                </article>
              ))}
          </div>
        )}
      </section>

      <section className="jida-contact">
        <div className="jida-contact-header">
          <p className="jida-contact-kicker">Contact</p>
          <h2>Contact Us</h2>
        </div>

        <div className="jida-contact-body">
          <div className="jida-contact-info-card">
            <div className="jida-contact-item">
              <span className="jida-contact-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div>
                <strong>Address</strong>
                <p>Kigali, Rwanda</p>
              </div>
            </div>

            <div className="jida-contact-item">
              <span className="jida-contact-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.7 3.41 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l1.16-1.16a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <div>
                <strong>Call Us</strong>
                <p>+250 000 000 000</p>
              </div>
            </div>

            <div className="jida-contact-item">
              <span className="jida-contact-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <div>
                <strong>Email Us</strong>
                <p>
                  <b>Submissions:</b> submissions@jida.ac.rw
                </p>
                <p>
                  <b>Editorial:</b> editor@jida.ac.rw
                </p>
                <p>
                  <b>General:</b> info@jida.ac.rw
                </p>
              </div>
            </div>
          </div>

          <div className="jida-contact-map">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1726.356863669244!2d30.10419664232857!3d-1.9554253870061855!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dca6f907feabf7%3A0x207b54b64c8ffb34!2sAdventist%20University%20of%20Central%20Africa%2C%20Science%20and%20Technology%20Centre!5e1!3m2!1sen!2srw!4v1782830850584!5m2!1sen!2srw"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              title="JIDA Location"
            />
          </div>
        </div>
      </section>

      <footer className="jida-footer">
        <span>
          © {new Date().getFullYear()} Journal of Inter-Discourse Academia. All
          Rights Reserved.
        </span>
      </footer>
    </main>
  );
}
