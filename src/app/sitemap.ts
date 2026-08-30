import type { MetadataRoute } from "next";
import { fetchPublicAnnouncements, fetchPublishedIssues, issueSlug, SITE } from "@/lib/public-content";

/**
 * The list of pages Google and Google Scholar should crawl.
 *
 * Only public reading surfaces belong here — the dashboards behind a login are
 * excluded in `robots.ts`. Article URLs come from the API rather than a static
 * list so a newly published article is discoverable without a redeploy.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [issues, announcements] = await Promise.all([
    fetchPublishedIssues(),
    fetchPublicAnnouncements(),
  ]);

  const articles: MetadataRoute.Sitemap = issues.flatMap((issue) =>
    (issue.publications ?? []).map((pub) => ({
      url: `${SITE}/archive/${pub.slug}`,
      lastModified: new Date(pub.publishedAt),
      changeFrequency: "yearly" as const,
      // Articles are the point of the site, so they outrank the browse pages.
      priority: 0.9,
    })),
  );

  // The issue pages are the browse path Scholar asks for, so they are listed
  // too — between the archive and the articles in importance.
  const issuePages: MetadataRoute.Sitemap = issues.map((issue) => ({
    url: `${SITE}/archive/issue/${issueSlug(issue)}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const newestArticle = articles.reduce<Date | undefined>((latest, entry) => {
    const when = entry.lastModified as Date;
    return !latest || when > latest ? when : latest;
  }, undefined);

  return [
    { url: SITE, lastModified: newestArticle ?? new Date(), changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE}/archive`,
      lastModified: newestArticle ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    { url: `${SITE}/archive/advanced-search`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/about`, changeFrequency: "yearly", priority: 0.5 },
    // A call for papers is only worth publishing if it can be found.
    ...(announcements.length
      ? [{ url: `${SITE}/announcements`, changeFrequency: "weekly" as const, priority: 0.7 }]
      : []),
    ...announcements.map((a) => ({
      url: `${SITE}/announcements/${a.slug}`,
      lastModified: new Date(a.createdAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...issuePages,
    ...articles,
  ];
}
