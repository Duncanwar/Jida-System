"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/features/jida/components";
import {
  getPublicIssues,
  getPublicArticles,
  type PublicIssue,
  type PublicArticle,
} from "@/lib/api";

export default function Home() {
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [articles, setArticles] = useState<PublicArticle[]>([]);

  useEffect(() => {
    getPublicIssues()
      .then(setIssues)
      .catch(() => {});
    getPublicArticles()
      .then(setArticles)
      .catch(() => {});
  }, []);
  console.log("issues", issues);
  const articleCount = articles.length
  console.log("articleCount", articleCount);
  console.log("articleCount", issues, articles);

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

      <div className="jida-home-mission">
        <p>
          JIDA is committed to advancing rigorous, peer-reviewed academic
          discourse across disciplines — connecting authors, reviewers, and
          editors in a structured digital workflow.
        </p>
        <Link href="/signup">Apply as Author</Link>
      </div>

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
