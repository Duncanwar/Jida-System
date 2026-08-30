import type { PublicIssue } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** Public origin of this site. Must be set in production — Google resolves the
 *  sitemap and citation URLs from its own crawler, not relative to a page. */
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Every published issue with its articles, for the two places that have to be
 * readable without JavaScript: the sitemap, and the archive's crawlable index.
 *
 * Uses a bare `fetch` rather than `lib/api`'s `request` so a backend outage
 * degrades to an empty list instead of throwing — a sitemap that 500s is worse
 * for indexing than one that is briefly short.
 */
export async function fetchPublishedIssues(): Promise<PublicIssue[]> {
  try {
    const res = await fetch(`${API}/api/public/issues`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as PublicIssue[];
  } catch {
    return [];
  }
}

/** Issues sorted newest-first, each with its articles newest-first. */
export function sortIssues(issues: PublicIssue[]): PublicIssue[] {
  return issues
    .slice()
    .sort((a, b) => b.year - a.year || b.volume - a.volume || b.issueNumber - a.issueNumber)
    .map((issue) => ({
      ...issue,
      publications: (issue.publications ?? [])
        .slice()
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    }));
}

/**
 * Readable, stable address for an issue page — "volume-5-issue-1-2024".
 *
 * Built from the issue's own numbering rather than its database id so the URL
 * means something to a reader, survives a database restore, and matches how the
 * issue is cited in print.
 */
export function issueSlug(issue: { volume: number; issueNumber: number; year: number }): string {
  return `volume-${issue.volume}-issue-${issue.issueNumber}-${issue.year}`;
}

/** A journal announcement published on the public site. */
export interface PublicAnnouncement {
  id: string;
  slug: string;
  title: string;
  body: string;
  createdAt: string;
}

/**
 * Announcements the editors marked public. Same defensive shape as
 * `fetchPublishedIssues`: a backend outage degrades to an empty list rather
 * than a 500, because these feed the sitemap as well as the page.
 */
export async function fetchPublicAnnouncements(): Promise<PublicAnnouncement[]> {
  try {
    const res = await fetch(`${API}/api/public/announcements`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as PublicAnnouncement[];
  } catch {
    return [];
  }
}
