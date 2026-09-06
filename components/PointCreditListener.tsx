"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { playRewardSound } from "@/lib/sound";

type CreditToast = {
  id: string;
  icon?: string;
  title: string;
  message: string;
  points?: number;
};

export default function PointCreditListener() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<CreditToast | null>(null);
  const lastBalanceRef = useRef<number | null>(null);

  // Expose playRewardSound globally for testing or explicit triggers
  useEffect(() => {
    (window as unknown as { __playRewardSound?: () => void }).__playRewardSound = playRewardSound;
  }, []);

  // Check for ?reward=credited query parameter on landing
  useEffect(() => {
    const rewardStatus = searchParams?.get("reward");
    if (rewardStatus === "credited") {
      playRewardSound();
      setToast({
        id: "param-" + Date.now(),
        title: "Points Credited! 🎉",
        message: "Your reward has been successfully added to your balance.",
      });

      // Remove the query param cleanly without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("reward");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  }, [searchParams]);

  // Real-time listener for user balance and reward notifications
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    async function setupSubscription() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isMounted) return;

        // Fetch initial balance
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("available_points")
          .eq("id", user.id)
          .maybeSingle();

        if (profile && isMounted) {
          lastBalanceRef.current = Number(profile.available_points ?? 0);
        }

        // Unique channel ID ensures clean registration without channel cache collision
        const channelId = `point-listener-${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        channel = supabase.channel(channelId);

        channel
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "user_profiles",
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              if (!isMounted) return;
              const newBal = Number(payload.new?.available_points ?? 0);
              const oldBal =
                lastBalanceRef.current ??
                Number(payload.old?.available_points ?? 0);
              lastBalanceRef.current = newBal;

              if (newBal > oldBal) {
                const gained = newBal - oldBal;
                playRewardSound();
                setToast({
                  id: "bal-" + Date.now(),
                  title: "Reward Received! 💰",
                  message: `+${gained.toLocaleString()} points added to your balance!`,
                  points: gained,
                });
                router.refresh();
              }
            }
          )
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
              const notif = payload.new;
              if (!notif) return;

              let icon = "🔔";
              if (notif.type === "reward") icon = "🎁";
              else if (notif.type === "withdrawal") icon = "💸";
              else if (notif.type === "account") icon = "👤";

              playRewardSound();
              setToast({
                id: "notif-" + Date.now(),
                icon,
                title: notif.title || "New Notification",
                message:
                  notif.message ||
                  "You have a new update in your account.",
              });
              router.refresh();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn("PointCreditListener subscription error:", err);
      }
    }

    setupSubscription();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router]);

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <aside
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "28px",
        right: "28px",
        zIndex: 9999,
        background: "linear-gradient(135deg, #1e1b4b 0%, #172554 100%)",
        border: "1px solid rgba(129, 140, 248, 0.4)",
        boxShadow: "0 14px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.25)",
        borderRadius: "14px",
        padding: "16px 20px",
        maxWidth: "380px",
        color: "#ffffff",
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          fontSize: "24px",
          lineHeight: 1,
          flexShrink: 0,
          background: "rgba(99, 102, 241, 0.2)",
          padding: "8px",
          borderRadius: "10px",
        }}
      >
        {toast.icon || (toast.points ? "🪙" : "🔔")}
      </div>

      <div style={{ flex: 1 }}>
        <strong
          style={{
            display: "block",
            fontSize: "15px",
            color: "#fde047",
            marginBottom: "4px",
            fontWeight: 700,
          }}
        >
          {toast.title}
        </strong>
        <p style={{ margin: 0, fontSize: "13px", color: "#e0e7ff", lineHeight: 1.4 }}>
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setToast(null)}
        style={{
          background: "transparent",
          border: 0,
          color: "#94a3b8",
          fontSize: "18px",
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </aside>
  );
}
