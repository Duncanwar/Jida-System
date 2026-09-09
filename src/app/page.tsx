"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/features/jida/components";
import {
  formatIssueTitle,
  getPublicArticles,
  getPublicIssues,
  issueArticleCount,
  subscribeNewsletter,
  type PublicArticle,
  type PublicIssue,
} from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [newsletterMsg, setNewsletterMsg] = useState<string | null>(null);

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
    router.push(`/archive/advanced-search${params.toString() ? `?${params}` : ""}`);
  }

  async function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewsletterStatus("loading");
    setNewsletterMsg(null);
    try {
      await subscribeNewsletter(newsletterEmail.trim());
      setNewsletterStatus("done");
      setNewsletterMsg("You're subscribed — we'll email you when a new issue is published.");
      setNewsletterEmail("");
    } catch (err) {
      setNewsletterStatus("error");
      setNewsletterMsg(err instanceof Error ? err.message : "Subscription failed. Please try again.");
    }
  }

  // A volume can carry several issues, so the two counts differ: distinct
  // volume numbers, and issues published overall.
  const volumeCount = new Set(issues.map((i) => i.volume)).size;
  const issueCount = issues.length;

  const latestArticles = articles
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  // Issues already arrive newest-first from the API — the three most recent
  // are the "news" of what's just been published.
  const recentIssues = issues.slice(0, 3);

  return (
    <main className="jida-shell">
      <AppHeader />

      <section className="jida-home-hero">
        <div className="jida-home-hero-copy">
          <p className="jida-home-hero-eyebrow">
            Journal of Inter-Discourse Academia
          </p>
          <h2>
            Advancing <span>Scholarship</span>
          </h2>
          <p>
            A premier peer-reviewed platform for impactful research and academic
            discourse across diverse disciplines.
          </p>
          <div className="jida-hero-actions">
            <Link href="/signup" className="jida-btn-primary">
              Submit Manuscript
            </Link>
            <Link href="/archive" className="jida-btn-secondary">
              Browse Archive
            </Link>
          </div>
        </div>
      </section>

      <section className="jida-home-search" aria-labelledby="home-search-title">
        <form className="jida-home-search-form" onSubmit={handleSearch}>
          <div className="jida-home-search-row">
            <input
              id="home-article-search"
              type="search"
              placeholder="Search by Title, Author, DOI, or Keywords..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit">Search</button>
          </div>
        </form>
      </section>

      <section
        id="jida-articles-section"
        className="jida-home-news"
        aria-labelledby="home-news-title"
      >
        <div className="jida-home-section-heading">
          <div>
            <p className="jida-section-kicker">Articles &amp; Publication</p>
            {/* The heading is the section's own way into the full archive. */}
            <h2 id="home-news-title">
              <Link href="/archive" className="jida-home-news-title-link">
                Latest articles and publication news
              </Link>
            </h2>
          </div>
          <Link href="/archive">Browse the archive →</Link>
        </div>
        {loading && <p className="jida-home-state">Loading publication updates...</p>}
        {error && <p className="jida-home-state jida-home-state-error">{error}</p>}
        {!loading && !error && articles.length === 0 && issues.length === 0 && (
          <p className="jida-home-state">New publications will appear here.</p>
        )}
        {!loading && !error && (articles.length > 0 || issues.length > 0) && (
          <div className="jida-articles-columns">
            <div className="jida-latest-articles">
              <h3>Latest Articles</h3>
              {latestArticles.length === 0 ? (
                <p className="jida-home-state">New articles will appear here.</p>
              ) : (
                <div className="jida-article-cards">
                  {latestArticles.map((article) => (
                    <div key={article.id} className="jida-article-card">
                      <div className="jida-article-card-header">
                        <span className="jida-article-category">Original Research</span>
                        <time dateTime={article.publishedAt}>
                          {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(article.publishedAt))}
                        </time>
                      </div>
                      <Link href={`/archive/${article.slug}`} className="jida-article-card-title">
                        {article.manuscript.title}
                      </Link>
                      <p className="jida-article-card-authors">
                        {article.manuscript.author.name}
                        {article.manuscript.coAuthors?.length > 0 && 
                          `, ${article.manuscript.coAuthors.map(ca => ca.name).join(", ")}`}
                      </p>
                      <p className="jida-latest-meta">
                        {article.issue
                          ? `JIDA Vol. ${article.issue.volume}, No. ${article.issue.issueNumber} (${article.issue.year})`
                          : "JIDA publication"}
                      </p>
                      <div className="jida-article-card-footer">
                        <span className="jida-doi">DOI: 10.58221/jida.v{article.issue?.volume || 7}.{article.id.slice(0, 4)}</span>
                        <div className="jida-article-actions">
                          <button className="jida-icon-btn" title="Download PDF">
                            <Download size={16} />
                            <span>PDF</span>
                          </button>
                          <button className="jida-icon-btn" title="Cite this article">
                            <Quote size={16} />
                            <span>Cite</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="jida-recent-publications">
              <div className="jida-current-issue-callout">
                <span className="jida-issue-label">Current Issue</span>
                {recentIssues[0] && (
                  <div className="jida-current-issue-details">
                    <h4>{formatIssueTitle(recentIssues[0])}</h4>
                    <p>{issueArticleCount(recentIssues[0])} Published Articles</p>
                    <Link href="/archive" className="jida-issue-link">View Full Issue</Link>
                  </div>
                )}
              </div>
              
              <div className="jida-past-issues-list">
                <h3>Past Issues</h3>
                {recentIssues.length <= 1 ? (
                  <p className="jida-home-state">Past issues will appear here.</p>
                ) : (
                  <ul>
                    {recentIssues.slice(1).map((issue) => (
                      <li key={issue.id}>
                        <Link href="/archive">{formatIssueTitle(issue)}</Link>
                        <p className="jida-latest-meta">{issueArticleCount(issue)} articles</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="jida-newsletter" aria-labelledby="newsletter-title">
        <div className="jida-newsletter-copy">
          <p className="jida-section-kicker">Stay in the loop</p>
          <h2 id="newsletter-title">Get notified when a new issue is published</h2>
          <p>
            JIDA publishes twice a year, in June and December. Leave your
            email and we&apos;ll let you know the moment a new issue goes
            live — no other mail, ever.
          </p>
        </div>
        <form className="jida-newsletter-form" onSubmit={handleSubscribe}>
          <label htmlFor="newsletter-email">Email address</label>
          <div className="jida-newsletter-row">
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="you@example.com"
              value={newsletterEmail}
              onChange={(event) => setNewsletterEmail(event.target.value)}
              disabled={newsletterStatus === "loading"}
            />
            <button type="submit" disabled={newsletterStatus === "loading"}>
              {newsletterStatus === "loading" ? "Subscribing…" : "Notify me"}
            </button>
          </div>
          {newsletterMsg && (
            <p
              className={
                newsletterStatus === "error"
                  ? "jida-newsletter-msg jida-newsletter-msg-error"
                  : "jida-newsletter-msg"
              }
              role="status"
            >
              {newsletterMsg}
            </p>
          )}
        </form>
      </section>

      <section className="jida-contact">
        <div className="jida-contact-header">
          <h2>Contact Us</h2>
        </div>

        <div className="jida-contact-body">
          <div className="jida-contact-info-card">
            <div className="jida-contact-item">
              <div>
                <strong>Chief Editor: Prof. Jacques Kayigema</strong>
                <a href="mailto:jacques.kayigema@auca.ac.rw" className="jida-contact-link">jacques.kayigema@auca.ac.rw</a>
              </div>
            </div>

            <div className="jida-contact-item">
              <div>
                <strong>Associate Editor: Mr. Enock Nibishaka</strong>
                <a href="mailto:enock.nibishaka@auca.ac.rw" className="jida-contact-link">enock.nibishaka@auca.ac.rw</a>
              </div>
            </div>
            
            <div className="jida-contact-item">
              <div>
                <strong>Location</strong>
                <p>AUCA Gishushu, Kigali, Rwanda</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="jida-footer" id="jida-guidelines">
        <div className="jida-footer-grid">
          <div className="jida-footer-col jida-footer-about">
            <strong className="jida-footer-brand">JIDA</strong>
            <p>
              Journal of Inter-Discourse Academia — a biannual, peer-reviewed
              publication of the Adventist University of Central Africa
              (AUCA), providing interdisciplinary discussion on issues that
              affect our workplace and our society.
            </p>
            <p className="jida-footer-meta">
              Volume 7, Issue 1, 2026 · ISBN 978-9970-479-00-9 · © AUCA
            </p>
          </div>

          <div className="jida-footer-col">
            <h4>Explore</h4>
            <nav>
              <Link href="/">Home</Link>
              <Link href="/archive">Archive</Link>
              <Link href="/archive/advanced-search">Advanced search</Link>
              <Link href="/signup">Submit a manuscript</Link>
            </nav>
          </div>

          <div className="jida-footer-col">
            <h4>Submission guidelines</h4>
            <ul className="jida-footer-list">
              <li>English, maximum 15 pages</li>
              <li>Abstract: 250–300 words, including keywords</li>
              <li>Times New Roman 12, single-spaced, APA heading levels</li>
              <li>
                Publication fee: free for AUCA faculty, $50 for other authors
              </li>
            </ul>
          </div>

          <div className="jida-footer-col">
            <h4>Editorial board</h4>
            <ul className="jida-footer-board">
              <li>
                <strong>Prof. Kayigema Jacques</strong>
                <span>Chief Editor</span>
                <a href="mailto:jacques.kayigema@auca.ac.rw">
                  jacques.kayigema@auca.ac.rw
                </a>
              </li>
              <li>
                <strong>Mr. Nibishaka Enock</strong>
                <span>Associate Editor</span>
                <a href="mailto:enock.nibishaka@auca.ac.rw">
                  enock.nibishaka@auca.ac.rw
                </a>
              </li>
              <li>
                <strong>Mr. Nsabimana Aphrodise</strong>
                <span>Typesetting &amp; Marketing Advisor</span>
                <a href="mailto:aphrodice.nsabimana@auca.ac.rw">
                  aphrodice.nsabimana@auca.ac.rw
                </a>
              </li>
            </ul>
            <p className="jida-footer-enquiries">
              Enquiries: Prof. Kayigema Jacques · +250 788 866 769
            </p>
          </div>
        </div>

        <div className="jida-footer-bottom">
          <span>
            © {new Date().getFullYear()} Journal of Inter-Discourse Academia.
            All Rights Reserved.
          </span>
        </div>
      </footer>
    </main>
  );
}
