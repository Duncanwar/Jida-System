"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  HelpCircle,
  LogOut,
  Bell,
  Clock,
  X,
} from "lucide-react";
import {
  createReminder,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type Role,
} from "@/lib/api";
import { clearSession } from "@/lib/session";

// ─── Shared view model ───────────────────────────────────────────────────

export type DashboardView = "dashboard" | "tasks" | "team";

export type SidebarNavItem = { id: DashboardView; label: string; icon: typeof LayoutDashboard };

/** The role's task-list label — "My Manuscripts" for an author, and so on. */
const TASK_LABEL: Record<string, string> = {
  AUTHOR: "My Manuscripts",
  REVIEWER: "My Assignments",
  EDITOR: "Submissions",
  CHIEF_EDITOR: "Submissions",
  ASSOCIATE_EDITOR: "Submissions",
  ADMIN: "Users",
};

const SUPPORT_EMAIL = "info@jida.ac.rw";

// ─── DashboardSidebar ──────────────────────────────────────────────────────

export function DashboardSidebar({
  role,
  active,
  onNavigate,
  showTeam,
}: {
  role: Role | string;
  active: DashboardView;
  onNavigate: (view: DashboardView) => void;
  /** Editor/Admin only — blind peer review keeps this off Author/Reviewer. */
  showTeam: boolean;
}) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  const menuItems: SidebarNavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks", label: TASK_LABEL[role] ?? "Tasks", icon: FileText },
    ...(showTeam ? [{ id: "team" as const, label: "Team", icon: Users }] : []),
  ];

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setShowHelp(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  return (
    <aside className="jida-sidebar" aria-label="Dashboard navigation">
      <div>
        <p className="jida-sidebar-group-label">Menu</p>
        <nav className="jida-sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`jida-sidebar-item${active === item.id ? " active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={active === item.id ? "page" : undefined}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div>
        <p className="jida-sidebar-group-label">General</p>
        <nav className="jida-sidebar-nav">
          <div className="jida-sidebar-help-wrap" ref={helpRef}>
            <button type="button" className="jida-sidebar-item" onClick={() => setShowHelp((v) => !v)}>
              <HelpCircle size={16} />
              <span>Help</span>
            </button>
            {showHelp && (
              <div className="jida-help-popover">
                <strong>Need help?</strong>
                <p>
                  Reach us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                </p>
              </div>
            )}
          </div>
          <button type="button" className="jida-sidebar-item" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {showLogoutConfirm && (
        <div className="jida-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="jida-modal jida-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="jida-modal-header">
              <h3>Log out?</h3>
              <button type="button" className="jida-modal-close" onClick={() => setShowLogoutConfirm(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p className="jida-modal-body-text">Are you sure you want to log out of JIDA System?</p>
            <div className="jida-modal-actions">
              <button type="button" className="jida-btn-secondary" onClick={() => setShowLogoutConfirm(false)}>
                No
              </button>
              <button type="button" className="jida-btn-danger" onClick={handleLogout}>
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── NotificationBell ────────────────────────────────────────────────────

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      const res = await getNotifications();
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // Non-blocking — a failed poll just leaves the last known state.
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  async function handleMarkAllRead() {
    await markAllNotificationsRead().catch(() => {});
    refresh();
  }

  async function handleOpenItem(item: NotificationItem) {
    if (!item.readAt) {
      await markNotificationRead(item.id).catch(() => {});
      refresh();
    }
  }

  return (
    <div className="jida-notification-bell" ref={boxRef}>
      <button
        type="button"
        className="jida-settings-btn"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && <span className="jida-notification-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="jida-notification-dropdown">
          <div className="jida-notification-dropdown-head">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead}>Mark all read</button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="jida-article-empty-note">No reminders due yet.</p>
          ) : (
            <ul className="jida-notification-list">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={n.readAt ? "" : "unread"}
                  onClick={() => handleOpenItem(n)}
                >
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <time>{new Date(n.visibleAt).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ReminderButton ──────────────────────────────────────────────────────

export function ReminderButton({ manuscriptId }: { manuscriptId: string }) {
  const [open, setOpen] = useState(false);
  const [remindAt, setRemindAt] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!remindAt || !note.trim()) return;
    setStatus("saving");
    try {
      await createReminder(manuscriptId, new Date(remindAt).toISOString(), note.trim());
      setStatus("saved");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
        setRemindAt("");
        setNote("");
      }, 900);
    } catch {
      setStatus("error");
    }
  }

  return (
    <span className="jida-reminder-btn-wrap">
      <button
        type="button"
        className="jida-badge info"
        style={{ cursor: "pointer", border: "none" }}
        onClick={() => setOpen((v) => !v)}
      >
        <Clock size={11} style={{ marginRight: "0.25rem", verticalAlign: "-1px" }} />
        Remind me
      </button>
      {open && (
        <form className="jida-reminder-popover" onSubmit={handleSubmit}>
          <label>
            Remind me at
            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              required
            />
          </label>
          <label>
            Note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What should this reminder say?"
              required
            />
          </label>
          <div className="jida-reminder-popover-actions">
            <button type="submit" className="jida-btn-primary" disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Set reminder"}
            </button>
            <button type="button" className="jida-btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          {status === "error" && <p className="jida-home-state-error">Could not set reminder.</p>}
        </form>
      )}
    </span>
  );
}

// ─── TeamRoster ────────────────────────────────────────────────────────────

export type TeamPerson = { name: string; email?: string | null; affiliation?: string | null; roleLabel: string };

export function TeamRoster({ title, people }: { title: string; people: TeamPerson[] }) {
  return (
    <section className="jida-card">
      <div className="jida-section-heading">
        <div><p className="jida-section-kicker">Team</p><h2>{title}</h2></div>
        <span className="jida-badge info">{people.length} people</span>
      </div>
      {people.length === 0 ? (
        <p className="jida-article-empty-note">No one to show yet.</p>
      ) : (
        <div className="jida-team-grid">
          {people.map((p, i) => (
            <article key={`${p.email ?? p.name}-${i}`} className="jida-team-card">
              <div className="jida-team-avatar">{p.name.charAt(0).toUpperCase() || "?"}</div>
              <div>
                <strong>{p.name}</strong>
                <p className="jida-badge">{p.roleLabel}</p>
                {p.affiliation && <p className="jida-team-affiliation">{p.affiliation}</p>}
                {p.email && <a href={`mailto:${p.email}`} className="jida-team-email">{p.email}</a>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
