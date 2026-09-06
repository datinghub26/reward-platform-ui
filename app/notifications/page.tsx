import Link from "next/link";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import NotificationList from "./NotificationList";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export default async function NotificationsPage() {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // 1. Verify signed-in user
  // ---------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ---------------------------------------------------------
  // 2. Load this user's notifications
  // ---------------------------------------------------------

  const {
    data: notifications,
    error,
  } = await supabase
    .from("notifications")
    .select(
      `
        id,
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
      `
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  // ---------------------------------------------------------
  // 3. Database error
  // ---------------------------------------------------------

  if (error) {
    console.error(
      "Notifications load error:",
      error
    );

    return (
      <div className="dashboard-shell">
        <AppSidebar active="notifications" />

        <main className="dashboard-main">
          <div className="dashboard-top">
            <div>
              <span className="eyebrow">
                🔔 Notifications
              </span>

              <h1>Notifications</h1>

              <div className="muted">
                Stay updated with your RewardNova account.
              </div>
            </div>

            <Link
              className="btn"
              href="/dashboard"
            >
              ← Dashboard
            </Link>
          </div>

          <section className="dashboard-section">
            <div className="card admin-error">
              <div className="admin-error-icon">
                ⚠️
              </div>

              <h2>
                Unable to load notifications
              </h2>

              <p className="muted">
                We could not load your notifications
                right now.
              </p>

              <pre>{error.message}</pre>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 4. Normalize database rows
  // ---------------------------------------------------------

  const rows: Notification[] = (
    notifications ?? []
  ).map((item) => ({
    id: item.id,
    user_id: item.user_id,
    type: item.type ?? "system",
    title: item.title,
    message: item.message,
    is_read: Boolean(item.is_read),
    created_at: item.created_at,
  }));

  // ---------------------------------------------------------
  // 5. Calculate unread count
  // ---------------------------------------------------------

  const unreadCount = rows.filter(
    (item) => !item.is_read
  ).length;

  // ---------------------------------------------------------
  // 6. Render
  // ---------------------------------------------------------

  return (
    <div className="dashboard-shell">
      <AppSidebar active="notifications" />

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">
              🔔 Notifications
            </span>

            <h1>Notifications</h1>

            <div className="muted">
              Stay updated with your RewardNova account.
            </div>
          </div>

          <Link
            className="btn"
            href="/dashboard"
          >
            ← Dashboard
          </Link>
        </div>

        {/* -------------------------------------------------
            Statistics
        ------------------------------------------------- */}

        <section className="stats dashboard-stats">
          <div className="card">
            <div className="stat-label">
              Total notifications
            </div>

            <div className="stat-value">
              {rows.length}
            </div>

            <div className="stat-sub">
              Your recent account updates
            </div>
          </div>

          <div className="card">
            <div className="stat-label">
              Unread
            </div>

            <div className="stat-value">
              {unreadCount}
            </div>

            <div className="stat-sub">
              Notifications waiting for you
            </div>
          </div>

          <div className="card">
            <div className="stat-label">
              Status
            </div>

            <div className="stat-value">
              {unreadCount > 0
                ? "New"
                : "Up to date"}
            </div>

            <div className="stat-sub">
              {unreadCount > 0
                ? "You have unread updates"
                : "You're all caught up"}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------
            Notification list
        ------------------------------------------------- */}

        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <h2>Your notifications</h2>

              <p>
                Reward and account updates appear here.
              </p>
            </div>
          </div>

          <NotificationList notifications={rows} />
        </section>

        {/* -------------------------------------------------
            Information
        ------------------------------------------------- */}

        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <h2>
                What you'll see here
              </h2>

              <p>
                RewardNova will keep you informed
                about important account activity.
              </p>
            </div>
          </div>

          <div className="quick-grid">
            <div className="card quick">
              <span>🎁</span>

              <strong>Rewards</strong>

              <small>
                Get notified when eligible rewards
                are credited.
              </small>
            </div>

            <div className="card quick">
              <span>👤</span>

              <strong>Account</strong>

              <small>
                Receive important updates about
                your RewardNova account.
              </small>
            </div>

            <div className="card quick">
              <span>🔔</span>

              <strong>Updates</strong>

              <small>
                Important RewardNova updates will
                appear here.
              </small>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}