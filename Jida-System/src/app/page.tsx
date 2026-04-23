import Link from "next/link";
import { AppHeader, NotificationsPanel } from "@/features/jida/components";

export default function Home() {
  return (
    <main className="jida-shell">
      <AppHeader />
      <section className="jida-hero">
        <h2>Journal of Inter-Discourse Academia Digital Platform</h2>
        <p>
          This implementation follows your SRS features with modular role workspaces, searchable
          publication archive, revision tracking, reviewer progress, and editorial publishing flow
          using dummy data.
        </p>
        <div className="jida-actions">
          <Link href="/author">Author Workspace</Link>
          <Link href="/reviewer">Reviewer Workspace</Link>
          <Link href="/editor">Editor Workspace</Link>
          <Link href="/archive">Public Archive</Link>
        </div>
      </section>
      <NotificationsPanel />
    </main>
  );
}