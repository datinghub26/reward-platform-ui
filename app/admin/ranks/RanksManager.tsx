"use client";

import React, { useState, useTransition } from "react";
import { LeaderboardConfig, PrizeTier } from "@/lib/leaderboard";
import { saveLeaderboardConfigAction, distributeLeaderboardRewardsAction } from "./actions";

export interface RankCompetitor {
  id: string;
  rank: number;
  displayName: string;
  email: string;
  countryCode: string;
  leaderboardPoints: number;
  availablePoints: number;
}

interface RanksManagerProps {
  initialConfig: LeaderboardConfig;
  competitors: RankCompetitor[];
}

export default function RanksManager({
  initialConfig,
  competitors,
}: RanksManagerProps) {
  const [config, setConfig] = useState<LeaderboardConfig>(initialConfig);
  const [prizes, setPrizes] = useState<PrizeTier[]>(initialConfig.prizes);
  const [prizePoolEnabled, setPrizePoolEnabled] = useState(initialConfig.prizePoolEnabled);
  const [resetFrequency, setResetFrequency] = useState(initialConfig.resetFrequency);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePrizeChange = (index: number, field: keyof PrizeTier, value: unknown) => {
    setPrizes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addPrizeTier = () => {
    const nextRank = prizes.length + 1;
    setPrizes((prev) => [
      ...prev,
      { rank: nextRank, rewardPoints: 500, title: `Top ${nextRank} Place` },
    ]);
  };

  const removePrizeTier = (index: number) => {
    if (prizes.length <= 1) return;
    setPrizes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveConfig = () => {
    startTransition(async () => {
      const updatedConfig: LeaderboardConfig = {
        ...config,
        prizePoolEnabled,
        resetFrequency,
        prizes,
      };

      const res = await saveLeaderboardConfigAction(updatedConfig);
      if (res.success) {
        showToast(res.message || "Leaderboard settings saved!", "success");
        setConfig(updatedConfig);
      } else {
        showToast(res.error || "Failed to save settings", "error");
      }
    });
  };

  const handleDistribute = (resetPoints: boolean) => {
    const promptMsg = resetPoints
      ? "Are you sure you want to distribute prizes to top ranking users and RESET all leaderboard points to 0?"
      : "Are you sure you want to distribute prizes to top ranking users WITHOUT resetting points?";

    if (!confirm(promptMsg)) return;

    startTransition(async () => {
      const res = await distributeLeaderboardRewardsAction(resetPoints);
      if (res.success) {
        showToast(res.message || "Prizes distributed successfully!", "success");
      } else {
        showToast(res.error || "Failed to distribute prizes", "error");
      }
    });
  };

  const totalPrizePoints = prizes.reduce(
    (acc, p) => acc + (Number(p.rewardPoints) || 0),
    0
  );

  const filteredCompetitors = competitors.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.rank.toString() === q
    );
  });

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Leaderboard Ranks & Prize Pools</h1>
        <p className="admin-page-desc" style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
          Manage leaderboard prize distribution, ranking rewards, and automated monthly/weekly cycles.
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
          <div className="admin-stat-label">Prize Pool Size</div>
          <div className="admin-stat-val">{totalPrizePoints.toLocaleString()} pts</div>
          <div className="admin-stat-sub sub-green">
            <span>≈ ${(totalPrizePoints / 1000).toFixed(2)} USD in rewards</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Reset Frequency</div>
          <div className="admin-stat-val" style={{ textTransform: "capitalize" }}>
            {resetFrequency}
          </div>
          <div className="admin-stat-sub sub-blue">
            <span>Cycle reset cadence</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Active Competitors</div>
          <div className="admin-stat-val">{competitors.length}</div>
          <div className="admin-stat-sub sub-yellow">
            <span>Members with points this cycle</span>
          </div>
        </div>
      </div>

      {/* Prize Pool Configuration Card */}
      <div className="card" style={{ marginBottom: 24, padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
            🏆 Prize Pool & Reset Controls
          </h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="admin-btn"
              onClick={() => handleDistribute(true)}
              disabled={isPending || !prizePoolEnabled}
              style={{ color: "#facc15", borderColor: "rgba(250, 204, 21, 0.4)" }}
            >
              👑 Distribute & Reset Points
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleSaveConfig}
              disabled={isPending}
            >
              Save Prize Config
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="checkbox"
              id="enablePrizePool"
              checked={prizePoolEnabled}
              onChange={(e) => setPrizePoolEnabled(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#22c55e" }}
            />
            <label htmlFor="enablePrizePool" style={{ fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
              Enable Leaderboard Prize Pool
            </label>
          </div>

          <div>
            <label className="admin-form-label">Competition Cadence</label>
            <select
              className="admin-form-input"
              value={resetFrequency}
              onChange={(e) => setResetFrequency(e.target.value as any)}
            >
              <option value="monthly">Monthly Cycle</option>
              <option value="weekly">Weekly Cycle</option>
              <option value="biweekly">Bi-weekly Cycle</option>
            </select>
          </div>
        </div>

        {/* Prize Tiers List */}
        <label className="admin-form-label" style={{ marginBottom: 8, display: "block" }}>
          Tiered Rank Prizes
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "280px", overflowY: "auto", paddingRight: 4 }}>
          {prizes.map((p, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 140px 40px",
                gap: 10,
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.02)",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ fontWeight: 700, color: idx === 0 ? "#facc15" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#d97706" : "#94a3b8" }}>
                #{p.rank}
              </div>
              <input
                type="text"
                className="admin-form-input"
                value={p.title}
                onChange={(e) => handlePrizeChange(idx, "title", e.target.value)}
                placeholder="Prize Title"
                style={{ height: "34px", fontSize: "13px" }}
              />
              <input
                type="number"
                className="admin-form-input"
                value={p.rewardPoints}
                onChange={(e) => handlePrizeChange(idx, "rewardPoints", parseInt(e.target.value) || 0)}
                placeholder="Points"
                style={{ height: "34px", fontSize: "13px" }}
                min={0}
              />
              <button
                type="button"
                onClick={() => removePrizeTier(idx)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#f87171",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
                title="Remove tier"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addPrizeTier}
          className="admin-btn"
          style={{ marginTop: 12, fontSize: "12px", padding: "6px 14px" }}
        >
          + Add Rank Prize Tier
        </button>
      </div>

      {/* Live Competitors Table */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
          Live Top Competitors
        </h2>
        <input
          type="text"
          placeholder="Search competitors..."
          className="admin-form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "260px" }}
        />
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "10%" }}>Rank</th>
              <th style={{ width: "34%" }}>Member</th>
              <th style={{ width: "20%" }}>Leaderboard Points</th>
              <th style={{ width: "20%" }}>Eligible Prize</th>
              <th style={{ width: "16%" }}>Wallet Balance</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompetitors.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
                  No active competitors found for this leaderboard cycle.
                </td>
              </tr>
            ) : (
              filteredCompetitors.map((c) => {
                const prize = prizes.find((p) => p.rank === c.rank);
                const isTopThree = c.rank <= 3;

                return (
                  <tr key={c.id}>
                    <td>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          background:
                            c.rank === 1
                              ? "rgba(250, 204, 21, 0.2)"
                              : c.rank === 2
                              ? "rgba(203, 213, 225, 0.2)"
                              : c.rank === 3
                              ? "rgba(217, 119, 6, 0.2)"
                              : "rgba(255, 255, 255, 0.05)",
                          border: `1px solid ${
                            c.rank === 1
                              ? "#facc15"
                              : c.rank === 2
                              ? "#cbd5e1"
                              : c.rank === 3
                              ? "#d97706"
                              : "rgba(255, 255, 255, 0.15)"
                          }`,
                          color:
                            c.rank === 1
                              ? "#facc15"
                              : c.rank === 2
                              ? "#cbd5e1"
                              : c.rank === 3
                              ? "#f59e0b"
                              : "#94a3b8",
                          fontWeight: 700,
                          fontSize: "13px",
                        }}
                      >
                        {c.rank === 1 ? "👑" : c.rank === 2 ? "🥈" : c.rank === 3 ? "🥉" : c.rank}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
                        {c.displayName}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {c.email}
                      </div>
                    </td>

                    <td style={{ color: isTopThree ? "#facc15" : "#93c5fd", fontWeight: 700, fontSize: "14px" }}>
                      {c.leaderboardPoints.toLocaleString()} pts
                    </td>

                    <td>
                      {prize && c.leaderboardPoints > 0 ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: "rgba(34, 197, 94, 0.15)",
                            color: "#86efac",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                          }}
                        >
                          +{prize.rewardPoints.toLocaleString()} pts (${(prize.rewardPoints / 1000).toFixed(2)})
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                      )}
                    </td>

                    <td style={{ color: "#e2e8f0", fontSize: "13px" }}>
                      {c.availablePoints.toLocaleString()} pts
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
