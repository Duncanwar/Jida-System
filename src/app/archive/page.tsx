import { AppHeader, ArchiveWorkspace } from "@/features/jida/components";
import { fetchPublishedIssues, sortIssues } from "@/lib/public-content";

export default async function ArchivePage() {
  // Fetched here, on the server, purely so the "Browse by issue" links exist in
  // the HTML a crawler receives. Google Scholar's crawler does not run
  // JavaScript, so without this there is no path from the site to any article.
  const issues = sortIssues(await fetchPublishedIssues());

  return (
    <main className="jida-shell">
      <AppHeader />
      <ArchiveWorkspace initialIssues={issues} />
    </main>
  );
}
