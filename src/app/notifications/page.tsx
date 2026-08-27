"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AppHeader } from "@/features/jida/components";
import { AssignmentNotificationActions, formatRelativeTime } from "@/features/jida/dashboard-shell";
import {
  clearAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type Role,
} from "@/lib/api";
import { clearSession, dashboardByRole, isTokenExpired, readRole, readToken } from "@/lib/session";

/** Full notification history — any authenticated role. Reached from the
 * bell dropdown's "See all notifications" link. */
export default function NotificationsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [homePortal, setHomePortal] = useState("/");

  useEffect(() => {
    const token = readToken();
    if (!token || isTokenExpired(token)) {
      clearSession();
      router.replace("/login");
      return;
    }
    const role = readRole();
    setHomePortal(role ? (dashboardByRole[role as Role] ?? "/") : "/");
    setAuthorized(true);
  }, [router]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await getNotifications();
      setItems(res.items);
    } catch {
      /* non-blocking */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authorized) refresh();
  }, [authorized]);

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

  async function handleMarkAllRead() {
    await markAllNotificationsRead().catch(() => {});
    refresh();
  }

  async function handleClearAll() {
    await clearAllNotifications().catch(() => {});
    refresh();
  }

  if (!authorized) return null;

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <main className="jida-shell">
      <AppHeader />
      <nav className="jida-article-breadcrumb" aria-label="Breadcrumb">
        <Link href={homePortal}>Dashboard</Link>
        <span>›</span>
        <span className="jida-article-breadcrumb-current">Notifications</span>
      </nav>
      <section className="jida-workspace jida-notifications-page">
        <div className="jida-page-title">
          <div>
            <p className="jida-section-kicker">Notifications</p>
            <h2>All notifications</h2>
            <p>Everything sent to you, newest first.</p>
          </div>
        </div>

        <section className="jida-card">
          <div className="jida-section-heading">
            <div>
              <p className="jida-section-kicker">Inbox</p>
              <h2>{items.length} notification{items.length === 1 ? "" : "s"}</h2>
            </div>
            <div className="jida-notification-dropdown-head-actions">
              {unreadCount > 0 && (
                <button type="button" className="jida-btn-secondary" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button type="button" className="jida-btn-secondary" onClick={handleClearAll}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <p style={{ padding: "1rem" }}>Loading…</p>
          ) : items.length === 0 ? (
            <p className="jida-article-empty-note">No notifications yet.</p>
          ) : (
            <ul className="jida-notification-list jida-notification-list-full">
              {items.map((n) => (
                <li key={n.id} className={n.readAt ? "" : "unread"} onClick={() => handleOpenItem(n)}>
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
                      <AssignmentNotificationActions assignmentId={n.refId} onResolved={refresh} />
                    </div>
                  )}
                  <time title={new Date(n.visibleAt).toLocaleString()}>
                    {formatRelativeTime(n.visibleAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
