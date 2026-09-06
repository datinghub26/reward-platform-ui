"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Brand from "./Brand";
import SignOutButton from "./SignOutButton";
import { createClient } from "@/lib/supabase/client";
import { playNotificationSound } from "@/lib/sound";

export default function AppSidebar({
  active,
}: {
  active: string;
}) {
  const [email, setEmail] = useState("");
  const [unreadNotifications, setUnreadNotifications] =
    useState(0);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const handleUnreadChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      if (customEvent.detail && typeof customEvent.detail.count === "number") {
        setUnreadNotifications(customEvent.detail.count);
      }
    };

    window.addEventListener("notification-unread-changed", handleUnreadChange);

    async function loadSidebarData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isMounted) {
        return;
      }

      setEmail(user.email ?? "");

      const refreshUnread = async () => {
        const { count, error } = await supabase
          .from("notifications")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("user_id", user.id)
          .eq("is_read", false);

        if (!error && isMounted) {
          setUnreadNotifications(count ?? 0);
        }
      };

      await refreshUnread();

      const channelId = `sidebar-notifs-${user.id}-${Date.now()}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              playNotificationSound();
            }
            refreshUnread();
          }
        )
        .subscribe();
    }

    loadSidebarData();

    return () => {
      isMounted = false;
      window.removeEventListener("notification-unread-changed", handleUnreadChange);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const items = [
    ["dashboard", "🏠", "Dashboard", "/dashboard"],
    ["earn", "💰", "Earn", "/earn"],
    ["withdraw", "💸", "Withdraw", "/withdraw"],
    [
      "transactions",
      "📋",
      "Transactions",
      "/transactions",
    ],
    [
      "notifications",
      "🔔",
      "Notifications",
      "/notifications",
    ],
    [
      "leaderboard",
      "🏆",
      "Leaderboard",
      "/leaderboard",
    ],
    ["referrals", "👥", "Referrals", "/referrals"],
    ["profile", "👤", "Profile", "/profile"],
    ["support", "🆘", "Support", "/support"],
  ];

  return (
    <>
      <aside className="sidebar">
        <Brand />

        <nav
          className="side-nav"
          aria-label="Account navigation"
        >
          {items.map(([key, icon, label, href]) => (
            <Link
              className={active === key ? "active" : ""}
              href={href}
              key={key}
            >
              <span>{icon}</span>

              {label}

              {key === "notifications" &&
                unreadNotifications > 0 && (
                  <span
                    className="notification-count"
                    aria-label={`${unreadNotifications} unread notifications`}
                  >
                    {unreadNotifications > 99
                      ? "99+"
                      : unreadNotifications}
                  </span>
                )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar">RN</div>

            <div className="sidebar-user-copy">
              <strong>
                RewardNova Member
              </strong>

              <span>
                {email || "Signed in"}
              </span>
            </div>
          </div>

          <SignOutButton />
        </div>
      </aside>

      <nav
        className="mobile-nav"
        aria-label="Mobile navigation"
      >
        <Link
          className={
            active === "dashboard"
              ? "active"
              : ""
          }
          href="/dashboard"
        >
          <span>🏠</span>
          Home
        </Link>

        <Link
          className={
            active === "earn" ? "active" : ""
          }
          href="/earn"
        >
          <span>💰</span>
          Earn
        </Link>

        <Link
          className={
            active === "withdraw"
              ? "active"
              : ""
          }
          href="/withdraw"
        >
          <span>💸</span>
          Withdraw
        </Link>

        <Link
          className={
            active === "transactions"
              ? "active"
              : ""
          }
          href="/transactions"
        >
          <span>📋</span>
          Transactions
        </Link>

        <Link
          className={
            active === "notifications"
              ? "active"
              : ""
          }
          href="/notifications"
        >
          <span style={{ position: "relative", display: "inline-block", margin: "0 auto 3px" }}>
            <span style={{ display: "inline-block", fontSize: "18px" }}>🔔</span>
            {unreadNotifications > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-8px",
                  minWidth: "16px",
                  height: "16px",
                  padding: "0 4px",
                  background: "#ff334b",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: "800",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: "1",
                  border: "2px solid #0a1626",
                  boxShadow: "0 2px 6px rgba(255,51,75,0.4)",
                  zIndex: 2,
                }}
                aria-label={`${unreadNotifications} unread notifications`}
              >
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </span>
          Notifications
        </Link>

        <Link
          className={
            active === "referrals"
              ? "active"
              : ""
          }
          href="/referrals"
        >
          <span>👥</span>
          Referrals
        </Link>

        <Link
          className={
            active === "profile"
              ? "active"
              : ""
          }
          href="/profile"
        >
          <span>👤</span>
          Profile
        </Link>

        <Link
          className={
            active === "support"
              ? "active"
              : ""
          }
          href="/support"
        >
          <span>🆘</span>
          Help
        </Link>
      </nav>
    </>
  );
}