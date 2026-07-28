import { AppHeader, AdminWorkspace } from "@/features/jida/components";
import { RequireRole } from "@/components/auth/require-role";

export default function AdminPage() {
  return (
    <RequireRole role="ADMIN">
      <main className="jida-shell">
        <AppHeader />
        <AdminWorkspace />
      </main>
    </RequireRole>
  );
}
