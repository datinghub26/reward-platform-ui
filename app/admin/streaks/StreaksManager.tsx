"use client";

import React, { useState, useTransition } from "react";
import { StreaksConfig, StreakDay } from "@/lib/streaks";
import { saveStreaksConfigAction } from "./actions";

interface StreaksManagerProps {
  initialConfig: StreaksConfig;
}

export default function StreaksManager({ initialConfig }: StreaksManagerProps) {
  const [enabled, setEnabled] = useState(initialConfig.enabled);
  const [minDailyPoints, setMinDailyPoints] = useState(initialConfig.minDailyPoints);
  const [maxStreakFreeze, setMaxStreakFreeze] = useState(initialConfig.maxStreakFreeze);
  const [streakDays, setStreakDays] = useState<StreakDay[]>(initialConfig.streakDays);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDayPointsChange = (dayIndex: number, points: number) => {
    setStreakDays((prev) => {
      const copy = [...prev];
      copy[dayIndex] = { ...copy[dayIndex], bonusPoints: points };
      return copy;
    });
  };

  const handleDayTitleChange = (dayIndex: number, title: string) => {
    setStreakDays((prev) => {
      const copy = [...prev];
      copy[dayIndex] = { ...copy[dayIndex], title };
      return copy;
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const updatedConfig: StreaksConfig = {
        enabled,
        minDailyPoints: Number(minDailyPoints),
        maxStreakFreeze: Number(maxStreakFreeze),
        streakDays,
      };

      const res = await saveStreaksConfigAction(updatedConfig);
      if (res.success) {
        showToast(res.message || "Streaks configuration saved!", "success");
      } else {
        showToast(res.error || "Failed to save streaks", "error");
      }
    });
  };

  const totalCyclePoints = streakDays.reduce(
    (sum, d) => sum + (Number(d.bonusPoints) || 0),
    0
  );

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Daily Streaks Configuration</h1>
        <p className="admin-page-desc" style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
          Configure consecutive daily check-in rewards, milestone point bonuses, and qualification thresholds.
        </p>
      </div>

      {toast && (
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: toast.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${toast.type === "success" ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
            borderRadius: "8px",
            color: toast.type === "success" ? "#4ade80" : "#f87171",
            fontSize: "13px",
            fontWeight: 500,
            marginBottom: "20px",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Metrics Row */}
      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Full 7-Day Cycle Bonus</div>
          <div className="admin-stat-val">+{totalCyclePoints.toLocaleString()} pts</div>
          <div className="admin-stat-sub sub-green">
            <span>Total earned for 7 consecutive days</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Daily Qualifying Threshold</div>
          <div className="admin-stat-val">{minDailyPoints} pts</div>
          <div className="admin-stat-sub sub-yellow">
            <span>Min earnings required per day</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Streak Status</div>
          <div className="admin-stat-val" style={{ color: enabled ? "#4ade80" : "#f87171" }}>
            {enabled ? "Active" : "Paused"}
          </div>
          <div className="admin-stat-sub sub-blue">
            <span>{maxStreakFreeze} missed day forgiveness</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Core Settings Card */}
        <div className="card" style={{ padding: "20px", marginBottom: 20 }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>
            ⚡ Streak Activation & Rules
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                id="enableStreaks"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#22c55e" }}
              />
              <label htmlFor="enableStreaks" style={{ fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                Enable Daily Streaks Engine
              </label>
            </div>

            <div>
              <label className="admin-form-label">Min Points to Keep Streak</label>
              <input
                type="number"
                className="admin-form-input"
                value={minDailyPoints}
                onChange={(e) => setMinDailyPoints(parseInt(e.target.value) || 0)}
                min={0}
                required
              />
            </div>

            <div>
              <label className="admin-form-label">Streak Freeze Limit (Days)</label>
              <input
                type="number"
                className="admin-form-input"
                value={maxStreakFreeze}
                onChange={(e) => setMaxStreakFreeze(parseInt(e.target.value) || 0)}
                min={0}
                max={5}
                required
              />
            </div>
          </div>
        </div>

        {/* 7-Day Reward Schedule */}
        <div className="card" style={{ padding: "20px", marginBottom: 20 }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>
            📅 7-Day Consecutive Reward Schedule
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {streakDays.map((d, idx) => {
              const isGrandPrize = d.day === 7;
              return (
                <div
                  key={d.day}
                  style={{
                    background: isGrandPrize ? "rgba(234, 179, 8, 0.08)" : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${isGrandPrize ? "rgba(234, 179, 8, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: isGrandPrize ? "#eab308" : "rgba(59, 130, 246, 0.2)",
                        color: isGrandPrize ? "#000" : "#93c5fd",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      Day {d.day}
                    </span>
                    {isGrandPrize && <span style={{ fontSize: "16px" }}>🎁</span>}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                      Milestone Title
                    </label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={d.title}
                      onChange={(e) => handleDayTitleChange(idx, e.target.value)}
                      style={{ height: "34px", fontSize: "13px" }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                      Bonus Points
                    </label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={d.bonusPoints}
                      onChange={(e) => handleDayPointsChange(idx, parseInt(e.target.value) || 0)}
                      style={{ height: "34px", fontSize: "13px", color: "#86efac", fontWeight: 700 }}
                      min={0}
                      required
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isPending}
            style={{ padding: "10px 24px", fontSize: "14px" }}
          >
            {isPending ? "Saving..." : "Save Streak Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}
