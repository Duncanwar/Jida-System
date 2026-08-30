import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/features/jida/components";
import { fetchPublicAnnouncements } from "@/lib/public-content";

export const metadata: Metadata = {
  title: "Announcements — JIDA",
  description:
    "Calls for papers and news from the Journal of Inter-Discourse Academia, Adventist University of Central Africa.",
};

/** Announcements are short; a preview is enough to decide whether to open one. */
function preview(body: string): string {
  const firstParagraph = body.split(/\n\s*\n/)[0]?.trim() ?? "";
  return firstParagraph.length > 220 ? `${firstParagraph.slice(0, 220).trimEnd()}…` : firstParagraph;
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(iso));

/**
 * Public announcements — calls for papers and journal news.
 *
 * Rendered on the server so search engines can read it. This page is the whole
 * point of the feature: an announcement that only reaches people who already
 * have an account cannot bring new authors to the journal.
 */
export default async function AnnouncementsPage() {
  const announcements = await fetchPublicAnnouncements();

  return (
    <main className="jida-shell">
      <AppHeader />
      <section className="jida-workspace">
        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">JIDA</p>
            <h2>Announcements</h2>
            <p>Calls for papers and news from the Journal of Inter-Discourse Academia.</p>
          </div>
        </div>

        {announcements.length === 0 ? (
          <section className="jida-card">
            <p className="jida-queue-empty">
              There are no announcements at the moment. Calls for papers appear here.
            </p>
          </section>
        ) : (
          <ul className="jida-announcement-list">
            {announcements.map((a) => (
              <li key={a.id}>
                <article className="jida-card jida-announcement-card">
                  <time dateTime={a.createdAt}>{formatDate(a.createdAt)}</time>
                  <h3>
                    <Link href={`/announcements/${a.slug}`}>{a.title}</Link>
                  </h3>
                  <p>{preview(a.body)}</p>
                  <Link href={`/announcements/${a.slug}`} className="jida-announcement-more">
                    Read more →
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
