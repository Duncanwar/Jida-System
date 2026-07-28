import { AppHeader, AuthorWorkspace, NotificationsPanel } from "@/features/jida/components";
import { RequireRole } from "@/components/auth/require-role";

export default function AuthorPage() {
  return (
    <RequireRole role="AUTHOR">
      <main className="jida-shell">
        <AppHeader />
        <AuthorWorkspace />
        <NotificationsPanel />
      </main>
    </RequireRole>
  );
}

