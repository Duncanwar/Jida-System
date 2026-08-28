"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Users,
  Megaphone,
  History,
  LogOut,
  Bell,
  Clock,
  X,
  ClipboardList,
  Gavel,
  BookOpenCheck,
  Shield,
  Settings2,
} from "lucide-react";
import {
  createReminder,
  deleteNotification,
  clearAllNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  respondToAssignment,
  type NotificationItem,
  type Role,
} from "@/lib/api";
import { clearSession } from "@/lib/session";

// ─── Shared view model ───────────────────────────────────────────────────

export type DashboardView =
  | "dashboard"
  | "tasks"
  | "team"
  | "announcements"
  | "history"
  // Editor-only — replace the generic "tasks" page with 4 dedicated ones.
  | "manuscripts"
  | "peer-review"
  | "decisions"
  | "publication"
  // Reached from the Publication stat cards, not the sidebar.
  | "indexing"
  // Admin-only.
  | "roles"
  | "settings";

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

/**
 * Renders "2h ago", "Yesterday", "3d ago" for recent timestamps and falls
 * back to a plain date past about a week — the shape a Facebook-style
 * notification list uses so the list stays scannable without a clock.
 */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

// ─── DashboardSidebar ──────────────────────────────────────────────────────

export function DashboardSidebar({
  role,
  active,
  onNavigate,
  showTeam,
  showAnnouncements,
  showHistory,
  editorPages,
  showRoles,
  showSettings,
}: {
  role: Role | string;
  active: DashboardView;
  onNavigate: (view: DashboardView) => void;
  /** Editor/Admin only — blind peer review keeps this off Author/Reviewer. */
  showTeam: boolean;
  /** Editor only — post submission-period announcements. */
  showAnnouncements?: boolean;
  /** Reviewer only — completed reviews, kept separate from the live queue. */
  showHistory?: boolean;
  /** Editor only — Manuscripts/Peer Review/Decisions/Publication replace the generic "tasks" page. */
  editorPages?: boolean;
  /** Admin only — static reference matrix of what each role can actually do. */
  showRoles?: boolean;
  /** Admin only — real settings (auto-backups, in-app notifications) plus a "Planned" 2FA placeholder. */
  showSettings?: boolean;
}) {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Portal target isn't available during SSR — only render the modal into
  // document.body once mounted client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const menuItems: SidebarNavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(editorPages
      ? [
          { id: "manuscripts" as const, label: "Manuscripts", icon: FileText },
          { id: "peer-review" as const, label: "Peer Review", icon: ClipboardList },
          { id: "decisions" as const, label: "Decisions", icon: Gavel },
          { id: "publication" as const, label: "Publication", icon: BookOpenCheck },
        ]
      : [{ id: "tasks" as const, label: TASK_LABEL[role] ?? "Tasks", icon: FileText }]),
    ...(showTeam ? [{ id: "team" as const, label: "Team", icon: Users }] : []),
    ...(showAnnouncements ? [{ id: "announcements" as const, label: "Announcements", icon: Megaphone }] : []),
    ...(showHistory ? [{ id: "history" as const, label: "Review History", icon: History }] : []),
    ...(showRoles ? [{ id: "roles" as const, label: "Roles & Permissions", icon: Shield }] : []),
    ...(showSettings ? [{ id: "settings" as const, label: "System Settings", icon: Settings2 }] : []),
  ];

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
          <button type="button" className="jida-sidebar-item" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {showLogoutConfirm && mounted && createPortal(
        // Portalled straight to <body> — rendering this inside the sidebar
        // (which scrolls with `overflow-y: auto`) would let that ancestor
        // clip the fixed-position overlay to the sidebar's own narrow box,
        // leaving the rest of the dashboard visible and clickable around it.
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
        </div>,
        document.body,
      )}
    </aside>
  );
}

// ─── Assignment accept / decline (shared by the bell and /notifications) ──

/**
 * Inline Accept / Decline for a "you have been assigned a manuscript"
 * notification. Decline swaps in a required reason box. Either outcome
 * notifies the editor server-side.
 */
export function AssignmentNotificationActions({
  assignmentId,
  onResolved,
  compact,
}: {
  assignmentId: string;
  onResolved: () => void;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "declining" | "busy" | "done" | "error">("idle");
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<"accepted" | "declined" | null>(null);

  async function respond(accept: boolean) {
    if (!accept && !reason.trim()) {
      setMode("declining");
      return;
    }
    setMode("busy");
    try {
      await respondToAssignment(assignmentId, accept, accept ? undefined : reason.trim());
      setOutcome(accept ? "accepted" : "declined");
      setMode("done");
      onResolved();
    } catch {
      setMode("error");
    }
  }

  if (mode === "done") {
    return <p className="jida-inline-note">Assignment {outcome}. The editor has been notified.</p>;
  }

  return (
    <div className={`jida-assignment-actions${compact ? " compact" : ""}`}>
      {mode === "declining" ? (
        <>
          <textarea
            className="jida-assignment-reason"
            placeholder="Why are you declining this assignment?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <div className="jida-assignment-actions-row">
            <button type="button" className="jida-btn-secondary jida-btn-sm" onClick={() => setMode("idle")}>
              Back
            </button>
            <button
              type="button"
              className="jida-btn-danger jida-btn-sm"
              disabled={!reason.trim()}
              onClick={() => respond(false)}
            >
              Send decline
            </button>
          </div>
        </>
      ) : (
        <div className="jida-assignment-actions-row">
          <button
            type="button"
            className="jida-btn-primary jida-btn-sm"
            disabled={mode === "busy"}
            onClick={() => respond(true)}
          >
            Accept
          </button>
          <button
            type="button"
            className="jida-btn-secondary jida-btn-sm"
            disabled={mode === "busy"}
            onClick={() => setMode("declining")}
          >
            Decline
          </button>
        </div>
      )}
      {mode === "error" && <p className="jida-home-state-error">Could not send your response.</p>}
    </div>
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

  async function handleClearAll() {
    await clearAllNotifications().catch(() => {});
    refresh();
  }

  async function handleOpenItem(item: NotificationItem) {
    if (!item.readAt) {
      await markNotificationRead(item.id).catch(() => {});
      refresh();
    }
  }

  async function handleClearOne(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await deleteNotification(id).catch(() => {});
    refresh();
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
            <span className="jida-notification-dropdown-head-actions">
              {unreadCount > 0 && (
                <button type="button" onClick={handleMarkAllRead}>Mark all read</button>
              )}
              {items.length > 0 && (
                <button type="button" onClick={handleClearAll}>Clear all</button>
              )}
            </span>
          </div>
          {items.length === 0 ? (
            <p className="jida-article-empty-note">No notifications yet.</p>
          ) : (
            <ul className="jida-notification-list">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={n.readAt ? "" : "unread"}
                  onClick={() => handleOpenItem(n)}
                >
                  <button
                    type="button"
                    className="jida-notification-clear"
                    onClick={(e) => handleClearOne(e, n.id)}
                    aria-label="Clear notification"
                    title="Clear"
                  >
                    <X size={13} />
                  </button>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  {n.kind === "REVIEW_ASSIGNMENT" && n.refId && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <AssignmentNotificationActions
                        assignmentId={n.refId}
                        onResolved={refresh}
                        compact
                      />
                    </div>
                  )}
                  <time>{formatRelativeTime(n.visibleAt)}</time>
                </li>
              ))}
            </ul>
          )}
          <Link href="/notifications" className="jida-notification-see-all" onClick={() => setOpen(false)}>
            See all notifications
          </Link>
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

  function close() {
    setOpen(false);
    setStatus("idle");
    setRemindAt("");
    setNote("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!remindAt || !note.trim()) return;
    setStatus("saving");
    try {
      await createReminder(manuscriptId, new Date(remindAt).toISOString(), note.trim());
      setStatus("saved");
      setTimeout(close, 900);
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        className="jida-btn-secondary jida-btn-sm"
        onClick={() => setOpen(true)}
      >
        <Clock size={13} style={{ marginRight: "0.3rem", verticalAlign: "-2px" }} />
        Remind me
      </button>
      {/* Reuses the shared portaled dialog — always centred in the viewport,
          so it can never spill off-screen wherever the card sits. */}
      {open && (
        <ActionModal title="Set a reminder" onClose={close}>
          <form className="jida-reminder-form" onSubmit={handleSubmit}>
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
                rows={3}
                required
              />
            </label>
            {status === "error" && <p className="jida-home-state-error">Could not set reminder.</p>}
            <div className="jida-modal-actions">
              <button type="button" className="jida-btn-secondary" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="jida-btn-primary" disabled={status === "saving"}>
                {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Set reminder"}
              </button>
            </div>
          </form>
        </ActionModal>
      )}
    </>
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

// ─── StatCard ────────────────────────────────────────────────────────────

/**
 * A clickable metric card with an optional trend line ("+3 this week"),
 * matching the mockups' stat cards. `trend` is computed by the caller from
 * data it already has (e.g. counting rows created in the last 7 days) —
 * this component just renders it.
 */
export function StatCard({
  label,
  value,
  trend,
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  trend?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`jida-stat-card${active ? " active" : ""}`}
      onClick={onClick}
    >
      <span className="jida-stat-label">{label}</span>
      <strong className="jida-stat-value">{value}</strong>
      {trend && <span className="jida-stat-trend up">{trend}</span>}
    </button>
  );
}

// ─── ActivityTimeline ────────────────────────────────────────────────────

export type ActivityEvent = { id: string; title: string; detail: string };

export function ActivityTimeline({ items, emptyLabel }: { items: ActivityEvent[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="jida-activity-empty">{emptyLabel}</p>;
  }
  return (
    <ul className="jida-activity">
      {items.map((item) => (
        <li key={item.id} className="jida-activity-event">
          <b>{item.title}</b>
          <p>{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}

// ─── ActionModal ─────────────────────────────────────────────────────────

/**
 * Shared portaled dialog for the screening / editorial-decision / review-
 * submission forms — same overlay/portal pattern as the sidebar's logout
 * confirm, just a larger box (`.jida-modal-lg`) sized for a form instead of
 * a Yes/No prompt.
 */
export function ActionModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="jida-modal-overlay" onClick={onClose}>
      <div className="jida-modal jida-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="jida-modal-header">
          <h3>{title}</h3>
          <button type="button" className="jida-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="jida-action-modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
