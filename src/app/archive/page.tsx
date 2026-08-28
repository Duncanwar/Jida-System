import { AppHeader, ArchiveWorkspace } from "@/features/jida/components";
import { fetchPublishedIssues, sortIssues } from "@/lib/public-content";
import { formatIssueTitle } from "@/lib/api";
import Link from "next/link";

export default async function ArchivePage() {
  // Rendered on the server so search engines — and Google Scholar in
  // particular, whose crawler does not run JavaScript — have real links to
  // follow. ArchiveWorkspace below is the interactive archive readers use; it
  // fetches on the client and is invisible to a crawler, so without this index
  // there is no path from the site to any article.
  const issues = sortIssues(await fetchPublishedIssues());

  return (
    <main className="jida-shell">
      <AppHeader />
      <ArchiveWorkspace />

      {issues.length > 0 && (
        <nav className="jida-archive-index" aria-labelledby="archive-index-title">
          <h2 id="archive-index-title">All issues and articles</h2>
          <p>Every article published in JIDA, listed by issue.</p>
          {issues.map((issue) => (
            <section key={issue.id}>
              <h3>
                {formatIssueTitle(issue)}
                {issue.title ? ` — ${issue.title}` : ""}
              </h3>
              <ul>
                {(issue.publications ?? []).map((pub) => (
                  <li key={pub.id}>
                    <Link href={`/archive/${pub.slug}`}>{pub.manuscript.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      )}
    </main>
  );
}
