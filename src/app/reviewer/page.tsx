import { AppHeader, NotificationsPanel, ReviewerWorkspace } from "@/features/jida/components";
import { RequireRole } from "@/components/auth/require-role";

export default function ReviewerPage() {
  return (
    <RequireRole role="REVIEWER">
      <main className="jida-shell">
        <AppHeader />
        <ReviewerWorkspace />
        <NotificationsPanel />
      </main>
    </RequireRole>
  );
}

