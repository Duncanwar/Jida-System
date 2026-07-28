import { AppHeader, EditorWorkspace, NotificationsPanel } from "@/features/jida/components";
import { RequireRole } from "@/components/auth/require-role";

export default function EditorPage() {
  return (
    <RequireRole role="EDITOR">
      <main className="jida-shell">
        <AppHeader />
        <EditorWorkspace />
        <NotificationsPanel />
      </main>
    </RequireRole>
  );
}

