import type { MetadataRoute } from "next";
import { SITE } from "@/lib/public-content";

/**
 * Crawlers get the reading surfaces and nothing else.
 *
 * The dashboards are already behind a login, but listing them keeps signed-in
 * screens and single-use invitation links out of search results entirely —
 * Scholar's guidelines ask for stable public URLs, not session-bound ones.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/editor",
        "/reviewer",
        "/author",
        "/notifications",
        "/login",
        "/signup",
        "/check-email",
        "/verify-email",
        "/reset-password",
        "/invitations/",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
