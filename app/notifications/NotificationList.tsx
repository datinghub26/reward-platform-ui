"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { markNotificationAsRead, markAllNotificationsAsRead } from "./actions";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "reward":
      return "🎁";

    case "account":
      return "👤";

    default:
      return "🔔";
  }
}

function getNotificationLabel(type: string) {
  switch (type) {
    case "reward":
      return "Reward";

    case "account":
      return "Account";

    default:
      return "System";
  }
}

export default function NotificationList({
  notifications,
}: {
  notifications: Notification[];
}) {
  const router = useRouter();

  const [items, setItems] = useState(notifications);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Sync state if server prop updates
  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  // Realtime subscription for incoming notifications
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    async function setupRealtime() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isMounted) return;

      const channelId = `list-notifs-${user.id}-${Date.now()}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!isMounted) return;
            const newRow = payload.new as Notification;
            setItems((prev) => [newRow, ...prev.filter((n) => n.id !== newRow.id)]);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!isMounted) return;
            const updatedRow = payload.new as Notification;
            setItems((prev) =>
              prev.map((n) => (n.id === updatedRow.id ? { ...n, ...updatedRow } : n))
            );
          }
        )
        .subscribe();
    }

    setupRealtime();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const unreadCount = items.filter((n) => !n.is_read).length;

  async function handleMarkAsRead(notificationId: string) {
    setPendingId(notificationId);

    const result = await markNotificationAsRead(
      notificationId
    );

    if (!result.success) {
      console.error(
        "Unable to mark notification as read:",
        result.error
      );

      setPendingId(null);
      return;
    }

    // Update the UI immediately.
    setItems((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              is_read: true,
            }
          : notification
      )
    );

    setPendingId(null);

    // Refresh the server component so the database state
    // and page statistics stay synchronized.
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);

    const result = await markAllNotificationsAsRead();

    if (!result.success) {
      console.error("Unable to mark all as read:", result.error);
      setMarkingAll(false);
      return;
    }

    // Optimistically mark all items as read
    setItems((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );

    setMarkingAll(false);

    startTransition(() => {
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="card activity">
        <div className="empty-state">
          <strong>No notifications yet</strong>

          <p>
            Reward and account updates will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <span className="muted" style={{ fontSize: "13px" }}>
          {unreadCount > 0
            ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}`
            : "All notifications are marked as read"}
        </span>

        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleMarkAllAsRead}
            disabled={markingAll || isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "8px",
              cursor: markingAll ? "not-allowed" : "pointer",
            }}
          >
            <span>✓✓</span>
            <span>
              {markingAll
                ? "Marking all as read…"
                : `Mark all as read (${unreadCount})`}
            </span>
          </button>
        )}
      </div>

      <div className="card activity">
      {items.map((notification) => (
        <div
          className="activity-row"
          key={notification.id}
        >
          <div className="activity-left">
            <div className="activity-icon">
              {getNotificationIcon(
                notification.type
              )}
            </div>

            <div>
              <strong>
                {notification.title}
              </strong>

              <div className="muted">
                {notification.message}
              </div>

              <div className="muted">
                {getNotificationLabel(
                  notification.type
                )}{" "}
                ·{" "}
                {formatNotificationDate(
                  notification.created_at
                )}
              </div>
            </div>
          </div>

          <div>
            {notification.is_read ? (
              <span className="muted">
                Read
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  pendingId === notification.id ||
                  isPending
                }
                onClick={() =>
                  handleMarkAsRead(
                    notification.id
                  )
                }
              >
                {pendingId === notification.id
                  ? "Saving..."
                  : "Mark as read"}
              </button>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}