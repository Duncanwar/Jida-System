import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/features/jida/components";
import { fetchPublicAnnouncements, type PublicAnnouncement } from "@/lib/public-content";

async function findAnnouncement(slug: string): Promise<PublicAnnouncement | null> {
  const all = await fetchPublicAnnouncements();
  return all.find((a) => a.slug === slug) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const announcement = await findAnnouncement(slug);
  if (!announcement) return { title: "Announcement not found — JIDA" };
  return {
    title: `${announcement.title} — JIDA`,
    description: announcement.body.replace(/\s+/g, " ").slice(0, 300),
  };
}

/**
 * One announcement, on its own address so it can be shared and indexed.
 *
 * The editor writes plain text, so blank lines become paragraphs here. Nothing
 * is parsed as HTML — the body is rendered as text, so an announcement can
 * never inject markup into the public site.
 */
export default async function AnnouncementPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const announcement = await findAnnouncement(slug);
  if (!announcement) notFound();

  const paragraphs = announcement.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className="jida-shell">
      <AppHeader />
      <section className="jida-workspace">
        <nav className="jida-article-breadcrumb" aria-label="Breadcrumb">
          <Link href="/announcements">Announcements</Link>
          <span aria-hidden="true">›</span>
          <span className="jida-article-breadcrumb-current">{announcement.title}</span>
        </nav>

        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">Announcement</p>
            <h2>{announcement.title}</h2>
            <p>
              <time dateTime={announcement.createdAt}>
                {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
                  new Date(announcement.createdAt),
                )}
              </time>
            </p>
          </div>
        </div>

        <article className="jida-card jida-announcement-body">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>
      </section>
    </main>
  );
}
