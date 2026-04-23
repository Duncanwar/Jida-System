import { AppHeader, EditorWorkspace, NotificationsPanel } from "@/features/jida/components";

export default function EditorPage() {
  return (
    <main className="jida-shell">
      <AppHeader />
      <EditorWorkspace />
      <NotificationsPanel />
    </main>
  );
}

