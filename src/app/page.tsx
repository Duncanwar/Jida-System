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
    .slice(0, 5);

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
            Advancing <span>scholarship</span> across disciplines
          </h2>
          <p>
            A peer-reviewed digital platform for manuscript submission,
            structured editorial review, revision tracking, and publication —
            built for authors, reviewers, and editors.
          </p>
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

      <section className="jida-welcome" aria-labelledby="welcome-title">
        <p className="jida-section-kicker">Welcome</p>
        <h2 id="welcome-title">Welcome to The Journal of Inter-Discourse Academia</h2>
        <Link href="/about#about-jida" className="jida-advanced-toggle">
          Learn more about JIDA
        </Link>
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
          <Link href="/archive/advanced-search" className="jida-advanced-toggle">
            Advanced search
          </Link>
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
                <ul>
                  {latestArticles.map((article) => (
                    <li key={article.id}>
                      <Link href={`/archive/${article.slug}`}>{article.manuscript.title}</Link>
                      <p className="jida-latest-meta">
                        {article.issue
                          ? `Volume ${article.issue.volume}, Issue ${article.issue.issueNumber}, ${article.issue.year}`
                          : "JIDA publication"}
                      </p>
                      <time dateTime={article.publishedAt}>
                        Published: {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(article.publishedAt))}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="jida-recent-publications">
              <h3>Recent Publications</h3>
              {recentIssues.length === 0 ? (
                <p className="jida-home-state">New issues will appear here.</p>
              ) : (
                <ul>
                  {recentIssues.map((issue) => (
                    <li key={issue.id}>
                      <Link href="/archive">{formatIssueTitle(issue)}</Link>
                      <p className="jida-latest-meta">{issueArticleCount(issue)} articles</p>
                    </li>
                  ))}
                </ul>
              )}
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
                <p>
                  <b>Chief Editor:</b> +250 788 866 769
                </p>
                <p>
                  <b>Associate Editor:</b> +250 788 572 042
                </p>
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
                  <b>Chief Editor:</b> jacques.kayigema@auca.ac.rw
                </p>
                <p>
                  <b>Associate Editor:</b> enock.nibishaka@auca.ac.rw
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
              <li>
                <strong>Mr. Manirakiza Jean Baptiste</strong>
                <span>Typesetting &amp; Marketing Advisor</span>
                <a href="mailto:jeanbaptiste.manirakiza@auca.ac.rw">
                  jeanbaptiste.manirakiza@auca.ac.rw
                </a>
              </li>
              <li>
                <strong>Dr. Gatsinzi Patrick</strong>
                <span>Typesetting &amp; Marketing Advisor</span>
                <a href="mailto:Patrick.gatsinzi@auca.ac.rw">
                  Patrick.gatsinzi@auca.ac.rw
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
