import { AppHeader, NotificationsPanel, ReviewerWorkspace } from "@/features/jida/components";

export default function ReviewerPage() {
  return (
    <main className="jida-shell">
      <AppHeader />
      <ReviewerWorkspace />
      <NotificationsPanel />
    </main>
  );
}

