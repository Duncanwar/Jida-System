import { AppHeader, AuthorWorkspace, NotificationsPanel } from "@/features/jida/components";

export default function AuthorPage() {
  return (
    <main className="jida-shell">
      <AppHeader />
      <AuthorWorkspace />
      <NotificationsPanel />
    </main>
  );
}

