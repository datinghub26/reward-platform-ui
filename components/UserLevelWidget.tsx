"use client";

import React from "react";
import { LevelTier } from "@/lib/levels";

interface UserLevelWidgetProps {
  levelInfo: {
    currentTier: LevelTier;
    nextTier: LevelTier | null;
    progressPercent: number;
  };
  lifetimePoints: number;
}

export default function UserLevelWidget({
  levelInfo,
  lifetimePoints,
}: UserLevelWidgetProps) {
  const { currentTier, nextTier, progressPercent } = levelInfo;
  const badgeColor = currentTier.badgeColor || "#f59e0b";
  const multiplierText = currentTier.multiplierBonus > 0
    ? `+${currentTier.multiplierBonus}% Bonus Earnings`
    : "Base Rate";

  return (
    <div
      className="card level-widget-card"
      style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "14px",
        padding: "20px",
        marginBottom: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: badgeColor,
          opacity: 0.15,
          filter: "blur(35px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 800,
                color: "#ffffff",
                backgroundColor: badgeColor,
                boxShadow: `0 0 12px ${badgeColor}66`,
              }}
            >
              LVL {currentTier.level}
            </span>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>
              {currentTier.title}
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #94a3b8)" }}>
            Lifetime Points: <strong style={{ color: "#e2e8f0" }}>{lifetimePoints.toLocaleString()} XP</strong>
          </p>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(34, 197, 94, 0.12)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            padding: "6px 14px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: 700,
            color: "#86efac",
          }}
        >
          <span>⚡</span>
          <span>{multiplierText}</span>
        </div>
      </div>

      {/* Progress Bar towards Next Tier */}
      {nextTier ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
            <span>Progress to <strong>{nextTier.title} (Lvl {nextTier.level})</strong></span>
            <span><strong>{progressPercent}%</strong> ({lifetimePoints.toLocaleString()} / {nextTier.requiredPoints.toLocaleString()} XP)</span>
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${badgeColor}, #38bdf8)`,
                borderRadius: "4px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
            Earn {(nextTier.requiredPoints - lifetimePoints).toLocaleString()} more XP to level up and unlock a +{nextTier.rewardPoints.toLocaleString()} pts milestone bonus!
          </div>
        </div>
      ) : (
        <div style={{ fontSize: "13px", color: "#86efac", fontWeight: 600 }}>
          👑 Maximum Level Reached! You are earning at the highest tier with maximum rewards!
        </div>
      )}
    </div>
  );
}
