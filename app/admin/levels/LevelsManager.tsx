"use client";

import React, { useState, useTransition } from "react";
import { LevelTier } from "@/lib/levels";
import { saveLevelTierAction, deleteLevelTierAction } from "./actions";

interface LevelsManagerProps {
  initialTiers: LevelTier[];
  memberCountsByLevel: Record<number, number>;
  totalMembers: number;
}

export default function LevelsManager({
  initialTiers,
  memberCountsByLevel,
  totalMembers,
}: LevelsManagerProps) {
  const [tiers, setTiers] = useState<LevelTier[]>(initialTiers);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LevelTier | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formLevel, setFormLevel] = useState<number>(tiers.length + 1);
  const [formTitle, setFormTitle] = useState("");
  const [formRequiredPoints, setFormRequiredPoints] = useState<number>(0);
  const [formMultiplierBonus, setFormMultiplierBonus] = useState<number>(0.5);
  const [formRewardPoints, setFormRewardPoints] = useState<number>(100);
  const [formBadgeColor, setFormBadgeColor] = useState("#38bdf8");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreateModal = () => {
    const nextLvl = tiers.length > 0 ? Math.max(...tiers.map((t) => t.level)) + 1 : 1;
    const lastRequired = tiers.length > 0 ? Math.max(...tiers.map((t) => t.requiredPoints)) : 0;
    setEditingTier(null);
    setFormLevel(nextLvl);
    setFormTitle(`Level ${nextLvl}`);
    setFormRequiredPoints(lastRequired + 10000);
    setFormMultiplierBonus(tiers.length * 0.5);
    setFormRewardPoints(nextLvl * 500);
    setFormBadgeColor("#38bdf8");
    setModalOpen(true);
  };

  const openEditModal = (t: LevelTier) => {
    setEditingTier(t);
    setFormLevel(t.level);
    setFormTitle(t.title);
    setFormRequiredPoints(t.requiredPoints);
    setFormMultiplierBonus(t.multiplierBonus);
    setFormRewardPoints(t.rewardPoints);
    setFormBadgeColor(t.badgeColor || "#38bdf8");
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const tierData: LevelTier = {
        level: formLevel,
        title: formTitle.trim(),
        requiredPoints: Number(formRequiredPoints),
        multiplierBonus: Number(formMultiplierBonus),
        rewardPoints: Number(formRewardPoints),
        badgeColor: formBadgeColor,
      };

      const res = await saveLevelTierAction(tierData);
      if (res.success) {
        showToast(res.message || "Level tier saved!", "success");
        setTiers((prev) => {
          const idx = prev.findIndex((t) => t.level === tierData.level);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = tierData;
            return copy.sort((a, b) => a.level - b.level);
          }
          return [...prev, tierData].sort((a, b) => a.level - b.level);
        });
        setModalOpen(false);
      } else {
        showToast(res.error || "Failed to save level tier", "error");
      }
    });
  };

  const handleDelete = (level: number) => {
    if (!confirm(`Are you sure you want to delete Level ${level}?`)) return;

    startTransition(async () => {
      const res = await deleteLevelTierAction(level);
      if (res.success) {
        showToast(res.message || "Level deleted", "success");
        setTiers((prev) => prev.filter((t) => t.level !== level));
      } else {
        showToast(res.error || "Failed to delete tier", "error");
      }
    });
  };

  const filteredTiers = tiers.filter((t) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.level.toString().includes(q) ||
      t.requiredPoints.toString().includes(q)
    );
  });

  const maxLevel = tiers.length > 0 ? Math.max(...tiers.map((t) => t.level)) : 1;
  const maxBonus = tiers.length > 0 ? Math.max(...tiers.map((t) => t.multiplierBonus)) : 0;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Levels & Tiers</h1>
        <p className="admin-page-desc" style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
          Configure user progression levels, lifetime point thresholds, multiplier perks, and level-up rewards.
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
          <div className="admin-stat-label">Total Levels</div>
          <div className="admin-stat-val">{tiers.length}</div>
          <div className="admin-stat-sub sub-blue">
            <span>Progressive milestones (1 to {maxLevel})</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Max Multiplier Perk</div>
          <div className="admin-stat-val">+{maxBonus}%</div>
          <div className="admin-stat-sub sub-yellow">
            <span>Extra reward on completions</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Active Members</div>
          <div className="admin-stat-val">{totalMembers}</div>
          <div className="admin-stat-sub sub-green">
            <span>Real users progressing across tiers</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar" style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search levels..."
          className="admin-form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "280px" }}
        />

        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={openCreateModal}
          disabled={isPending}
        >
          + Add New Level Tier
        </button>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "10%" }}>Level</th>
              <th style={{ width: "24%" }}>Tier Title</th>
              <th style={{ width: "18%" }}>Required XP (Points)</th>
              <th style={{ width: "14%" }}>Perk Multiplier</th>
              <th style={{ width: "14%" }}>Level Up Reward</th>
              <th style={{ width: "10%" }}>Members</th>
              <th style={{ width: "10%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTiers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
                  No level tiers found matching search criteria.
                </td>
              </tr>
            ) : (
              filteredTiers.map((t) => {
                const count = memberCountsByLevel[t.level] || 0;
                return (
                  <tr key={t.level}>
                    <td>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: t.badgeColor ? `${t.badgeColor}22` : "rgba(255, 255, 255, 0.08)",
                          border: `1px solid ${t.badgeColor || "rgba(255, 255, 255, 0.2)"}`,
                          color: t.badgeColor || "#ffffff",
                          fontWeight: 700,
                          fontSize: "13px",
                        }}
                      >
                        {t.level}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
                        {t.title}
                      </div>
                    </td>

                    <td style={{ color: "#93c5fd", fontWeight: 600 }}>
                      {t.requiredPoints.toLocaleString()} pts
                    </td>

                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: t.multiplierBonus > 0 ? "rgba(234, 179, 8, 0.15)" : "rgba(107, 114, 128, 0.2)",
                          color: t.multiplierBonus > 0 ? "#facc15" : "#9ca3af",
                        }}
                      >
                        +{t.multiplierBonus}%
                      </span>
                    </td>

                    <td style={{ color: "#86efac", fontWeight: 600 }}>
                      {t.rewardPoints > 0 ? `+${t.rewardPoints.toLocaleString()} pts` : "—"}
                    </td>

                    <td>
                      <span className="badge" style={{ fontSize: "12px" }}>
                        {count} {count === 1 ? "user" : "users"}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="admin-btn-action"
                          style={{ fontSize: "12px", color: "#93c5fd" }}
                          onClick={() => openEditModal(t)}
                          disabled={isPending}
                        >
                          Edit
                        </button>
                        {t.level > 1 && (
                          <button
                            type="button"
                            className="admin-btn-action"
                            style={{ fontSize: "12px", color: "#f87171" }}
                            onClick={() => handleDelete(t.level)}
                            disabled={isPending}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => e.target === e.currentTarget && !isPending && setModalOpen(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#111827",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                {editingTier ? `Edit Level ${editingTier.level}` : "Create Level Tier"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div>
                  <label className="admin-form-label">Level Number</label>
                  <input
                    type="number"
                    className="admin-form-input"
                    value={formLevel}
                    onChange={(e) => setFormLevel(parseInt(e.target.value) || 1)}
                    disabled={editingTier !== null}
                    required
                    min={1}
                  />
                </div>
                <div>
                  <label className="admin-form-label">Tier Title</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Gold Elite"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="admin-form-label">Required Lifetime XP</label>
                  <input
                    type="number"
                    className="admin-form-input"
                    value={formRequiredPoints}
                    onChange={(e) => setFormRequiredPoints(parseInt(e.target.value) || 0)}
                    min={0}
                    required
                  />
                </div>
                <div>
                  <label className="admin-form-label">Perk Bonus (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="admin-form-input"
                    value={formMultiplierBonus}
                    onChange={(e) => setFormMultiplierBonus(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="admin-form-label">Level-Up Bonus (pts)</label>
                  <input
                    type="number"
                    className="admin-form-input"
                    value={formRewardPoints}
                    onChange={(e) => setFormRewardPoints(parseInt(e.target.value) || 0)}
                    min={0}
                  />
                </div>
                <div>
                  <label className="admin-form-label">Badge Accent Color</label>
                  <input
                    type="color"
                    className="admin-form-input"
                    value={formBadgeColor}
                    onChange={(e) => setFormBadgeColor(e.target.value)}
                    style={{ height: "42px", padding: "4px", cursor: "pointer" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setModalOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Save Level Tier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
