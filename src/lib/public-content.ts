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
