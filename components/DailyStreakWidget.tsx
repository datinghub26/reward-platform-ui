"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StreakDay } from "@/lib/streaks";
import { claimDailyStreakAction } from "@/app/actions/rewards";
import { playRewardSound } from "@/lib/sound";

interface DailyStreakWidgetProps {
  streakStatus: {
    currentStreak: number;
    targetDay: number;
    canClaimToday: boolean;
    alreadyClaimedToday: boolean;
    rewardPoints: number;
    todayPoints: number;
    minRequiredPoints: number;
    isQualified: boolean;
    canClaimNow: boolean;
  };
  schedule: StreakDay[];
}

export default function DailyStreakWidget({
  streakStatus: initialStatus,
  schedule,
}: DailyStreakWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(initialStatus);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleClaim = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await claimDailyStreakAction();
      if (res.success) {
        playRewardSound();
        setFeedback({
          type: "success",
          message: res.message || `+${res.points?.toLocaleString()} points claimed!`,
        });
        setStatus((prev) => ({
          ...prev,
          currentStreak: res.newStreak || prev.targetDay,
          alreadyClaimedToday: true,
          canClaimToday: false,
          canClaimNow: false,
        }));
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to claim daily streak.",
        });
      }
    });
  };

  const currentStreak = status.currentStreak;
  const targetDay = status.targetDay;
  const progressPercent = Math.min(100, Math.round((status.todayPoints / (status.minRequiredPoints || 50)) * 100));

  return (
    <div
      className="card streak-widget-card"
      style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "14px",
        padding: "20px",
        marginBottom: "24px",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "20px" }}>🔥</span>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
              Daily Streaks Ladder
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                backgroundColor: currentStreak > 0 ? "rgba(249, 115, 22, 0.2)" : "rgba(148, 163, 184, 0.15)",
                color: currentStreak > 0 ? "#fb923c" : "#94a3b8",
                border: `1px solid ${currentStreak > 0 ? "rgba(249, 115, 22, 0.4)" : "rgba(148, 163, 184, 0.2)"}`,
              }}
            >
              {currentStreak} DAY STREAK
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #94a3b8)" }}>
            Complete offers daily to build your streak and unlock up to 250 bonus points every week!
          </p>
        </div>

        {/* Claim Action Button or Status Badge */}
        <div>
          {status.alreadyClaimedToday ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                backgroundColor: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                color: "#86efac",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <span>✓</span> Claimed for Today!
            </div>
          ) : status.isQualified ? (
            <button
              onClick={handleClaim}
              disabled={isPending}
              className="btn btn-primary"
              style={{
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: 700,
                backgroundColor: "#22c55e",
                color: "#052e16",
                boxShadow: "0 0 16px rgba(34, 197, 94, 0.4)",
              }}
            >
              {isPending ? "Claiming..." : `Claim Day ${targetDay} (+${status.rewardPoints} pts)`}
            </button>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                backgroundColor: "rgba(234, 179, 8, 0.1)",
                border: "1px solid rgba(234, 179, 8, 0.25)",
                color: "#fde047",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <span>⏳</span> Earn {(status.minRequiredPoints - status.todayPoints).toLocaleString()} pts to unlock
            </div>
          )}
        </div>
      </div>

      {/* 7-Day Ladder Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
          gap: "10px",
          marginTop: "14px",
        }}
      >
        {schedule.map((dayItem) => {
          const isDone = (status.alreadyClaimedToday && dayItem.day <= currentStreak) ||
            (!status.alreadyClaimedToday && dayItem.day < targetDay);
          const isTarget = dayItem.day === targetDay;
          const isJackpot = dayItem.day === 7;

          let cardBg = "rgba(255, 255, 255, 0.03)";
          let borderColor = "rgba(255, 255, 255, 0.06)";
          let textColor = "#94a3b8";

          if (isDone) {
            cardBg = "rgba(34, 197, 94, 0.1)";
            borderColor = "rgba(34, 197, 94, 0.3)";
            textColor = "#86efac";
          } else if (isTarget) {
            cardBg = status.isQualified
              ? "rgba(249, 115, 22, 0.2)"
              : "rgba(234, 179, 8, 0.12)";
            borderColor = status.isQualified
              ? "rgba(249, 115, 22, 0.5)"
              : "rgba(234, 179, 8, 0.4)";
            textColor = status.isQualified ? "#fb923c" : "#fde047";
          }

          return (
            <div
              key={dayItem.day}
              style={{
                padding: "12px 8px",
                borderRadius: "10px",
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                textAlign: "center",
                position: "relative",
                transition: "transform 0.2s ease",
              }}
            >
              {isJackpot && (
                <div
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-4px",
                    fontSize: "14px",
                  }}
                  title="7-Day Jackpot!"
                >
                  👑
                </div>
              )}
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Day {dayItem.day}
              </div>
              <div style={{ fontSize: "18px", margin: "4px 0" }}>
                {isDone ? "✅" : isJackpot ? "🎁" : isTarget ? "🔥" : "🔒"}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: textColor }}>
                +{dayItem.bonusPoints}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>pts</div>
            </div>
          );
        })}
      </div>

      {/* Progress towards daily qualification */}
      {!status.alreadyClaimedToday && (
        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
            <span>Today&apos;s Qualification: <strong>{status.todayPoints} / {status.minRequiredPoints} pts</strong></span>
            <span>{progressPercent}% Complete</span>
          </div>
          <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                backgroundColor: status.isQualified ? "#22c55e" : "#f59e0b",
                borderRadius: "3px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            marginTop: "14px",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            backgroundColor: feedback.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${feedback.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: feedback.type === "success" ? "#86efac" : "#fca5a5",
          }}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
