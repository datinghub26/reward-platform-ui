"use client";

import React, { useState, useTransition } from "react";
import { PromoCode } from "@/lib/bonuses";
import { savePromoCodeAction, deletePromoCodeAction, togglePromoCodeStatusAction } from "./actions";

interface BonusesManagerProps {
  initialCodes: PromoCode[];
}

export default function BonusesManager({ initialCodes }: BonusesManagerProps) {
  const [codes, setCodes] = useState<PromoCode[]>(initialCodes);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form
  const [formCode, setFormCode] = useState("");
  const [formRewardPoints, setFormRewardPoints] = useState<number>(500);
  const [formMaxUses, setFormMaxUses] = useState<number>(500);
  const [formExpiresAt, setFormExpiresAt] = useState<string>("");
  const [formActive, setFormActive] = useState<boolean>(true);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreateModal = () => {
    setEditingCode(null);
    setFormCode("");
    setFormRewardPoints(500);
    setFormMaxUses(100);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setFormExpiresAt(d.toISOString().slice(0, 10));
    setFormActive(true);
    setModalOpen(true);
  };

  const openEditModal = (c: PromoCode) => {
    setEditingCode(c);
    setFormCode(c.code);
    setFormRewardPoints(c.rewardPoints);
    setFormMaxUses(c.maxUses);
    setFormExpiresAt(c.expiresAt ? c.expiresAt.slice(0, 10) : "");
    setFormActive(c.active);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const promoData: PromoCode = {
        id: editingCode?.id || `promo-${Date.now()}`,
        code: formCode.toUpperCase().trim(),
        rewardPoints: Number(formRewardPoints),
        maxUses: Number(formMaxUses),
        usedCount: editingCode?.usedCount || 0,
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
        active: formActive,
        createdAt: editingCode?.createdAt || new Date().toISOString(),
      };

      const res = await savePromoCodeAction(promoData);
      if (res.success) {
        showToast(res.message || "Promo code saved!", "success");
        setCodes((prev) => {
          const idx = prev.findIndex((c) => c.id === promoData.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = promoData;
            return copy;
          }
          return [promoData, ...prev];
        });
        setModalOpen(false);
      } else {
        showToast(res.error || "Failed to save promo code", "error");
      }
    });
  };

  const handleToggleActive = (c: PromoCode) => {
    startTransition(async () => {
      const newStatus = !c.active;
      const res = await togglePromoCodeStatusAction(c.id, newStatus);
      if (res.success) {
        showToast(res.message || "Status updated", "success");
        setCodes((prev) =>
          prev.map((item) => (item.id === c.id ? { ...item, active: newStatus } : item))
        );
      } else {
        showToast(res.error || "Failed to toggle status", "error");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;

    startTransition(async () => {
      const res = await deletePromoCodeAction(id);
      if (res.success) {
        showToast(res.message || "Promo code deleted", "success");
        setCodes((prev) => prev.filter((c) => c.id !== id));
      } else {
        showToast(res.error || "Failed to delete", "error");
      }
    });
  };

  const filteredCodes = codes.filter((c) => {
    if (filter === "active" && !c.active) return false;
    if (filter === "inactive" && c.active) return false;

    const q = search.toLowerCase().trim();
    if (!q) return true;
    return c.code.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
  });

  const activeCount = codes.filter((c) => c.active).length;
  const totalUses = codes.reduce((acc, c) => acc + (c.usedCount || 0), 0);
  const totalPointsAwarded = codes.reduce(
    (acc, c) => acc + (c.usedCount || 0) * (c.rewardPoints || 0),
    0
  );

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Bonuses & Promo Codes</h1>
        <p className="admin-page-desc" style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
          Create and manage promotional bonus codes, voucher redemption limits, and instant point awards.
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
          <div className="admin-stat-label">Active Promo Codes</div>
          <div className="admin-stat-val">{activeCount}</div>
          <div className="admin-stat-sub sub-green">
            <span>Currently redeemable by members</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Redemptions</div>
          <div className="admin-stat-val">{totalUses.toLocaleString()}</div>
          <div className="admin-stat-sub sub-blue">
            <span>Claims across all vouchers</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Points Distributed</div>
          <div className="admin-stat-val">{totalPointsAwarded.toLocaleString()} pts</div>
          <div className="admin-stat-sub sub-yellow">
            <span>≈ ${(totalPointsAwarded / 1000).toFixed(2)} USD value</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar" style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "active", "inactive"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`admin-btn ${filter === tab ? "admin-btn-primary" : ""}`}
              style={{ textTransform: "capitalize", fontSize: "13px", padding: "6px 14px" }}
              onClick={() => setFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            placeholder="Search promo codes..."
            className="admin-form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "240px" }}
          />

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateModal}
            disabled={isPending}
          >
            + New Promo Code
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "24%" }}>Promo Code</th>
              <th style={{ width: "16%" }}>Reward Points</th>
              <th style={{ width: "22%" }}>Usage / Capacity</th>
              <th style={{ width: "16%" }}>Expiration</th>
              <th style={{ width: "10%" }}>Status</th>
              <th style={{ width: "12%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCodes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
                  No promo codes found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredCodes.map((c) => {
                const percent = Math.min(100, Math.round((c.usedCount / (c.maxUses || 1)) * 100));
                const isExpired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();

                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "14px",
                            letterSpacing: "1px",
                            color: "#93c5fd",
                            background: "rgba(59, 130, 246, 0.15)",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                          }}
                        >
                          {c.code}
                        </span>
                      </div>
                    </td>

                    <td style={{ color: "#86efac", fontWeight: 700, fontSize: "14px" }}>
                      +{c.rewardPoints.toLocaleString()} pts
                    </td>

                    <td>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: 4 }}>
                        <span style={{ color: "#e2e8f0" }}>{c.usedCount} used</span>
                        <span style={{ color: "var(--muted)" }}>{c.maxUses} max</span>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${percent}%`,
                            height: "100%",
                            background: percent >= 100 ? "#f87171" : "#3b82f6",
                          }}
                        />
                      </div>
                    </td>

                    <td style={{ fontSize: "12px", color: isExpired ? "#f87171" : "var(--muted)" }}>
                      {c.expiresAt ? (
                        <>
                          {new Date(c.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {isExpired && " (Expired)"}
                        </>
                      ) : (
                        "Never"
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c)}
                        disabled={isPending}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        title="Click to toggle active status"
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "36px",
                            height: "20px",
                            borderRadius: "10px",
                            background: c.active ? "#22c55e" : "rgba(255, 255, 255, 0.15)",
                            position: "relative",
                            transition: "background 0.2s",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              background: "#ffffff",
                              position: "absolute",
                              top: "3px",
                              left: c.active ? "19px" : "3px",
                              transition: "left 0.2s",
                            }}
                          />
                        </span>
                      </button>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="admin-btn-action"
                          style={{ fontSize: "12px", color: "#93c5fd" }}
                          onClick={() => openEditModal(c)}
                          disabled={isPending}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-btn-action"
                          style={{ fontSize: "12px", color: "#f87171" }}
                          onClick={() => handleDelete(c.id)}
                          disabled={isPending}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
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
                {editingCode ? `Edit Promo Code` : "Create New Promo Code"}
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
              <div>
                <label className="admin-form-label">Code String</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. NOVAPROMO500"
                  required
                  style={{ textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="admin-form-label">Reward Points</label>
                  <input
                    type="number"
                    className="admin-form-input"
                    value={formRewardPoints}
                    onChange={(e) => setFormRewardPoints(parseInt(e.target.value) || 0)}
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="admin-form-label">Max Redemptions</label>
                  <input
                    type="number"
                    className="admin-form-input"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(parseInt(e.target.value) || 0)}
                    min={1}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="admin-form-label">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", paddingTop: "24px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#22c55e" }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>Active Immediately</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
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
                  {isPending ? "Saving..." : "Save Promo Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
