"use client";

import React, { useState, useTransition } from "react";
import { Campaign } from "@/lib/campaigns";
import {
  saveCampaignAction,
  deleteCampaignAction,
  toggleCampaignStatusAction,
} from "./actions";

interface CampaignManagerProps {
  initialCampaigns: Campaign[];
}

export default function CampaignManager({ initialCampaigns }: CampaignManagerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [multiplier, setMultiplier] = useState("2.0");
  const [bonusPoints, setBonusPoints] = useState("500");
  const [status, setStatus] = useState<"active" | "scheduled" | "completed" | "paused">("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreateModal = () => {
    setEditingCampaign(null);
    setTitle("");
    setDescription("");
    setMultiplier("2.0");
    setBonusPoints("500");
    setStatus("active");
    const now = new Date();
    setStartDate(now.toISOString().split("T")[0]);
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setEndDate(future.toISOString().split("T")[0]);
    setModalOpen(true);
  };

  const openEditModal = (camp: Campaign) => {
    setEditingCampaign(camp);
    setTitle(camp.title);
    setDescription(camp.description);
    setMultiplier(String(camp.multiplier));
    setBonusPoints(String(camp.bonusPoints));
    setStatus(camp.status);
    setStartDate(camp.startDate ? camp.startDate.split("T")[0] : "");
    setEndDate(camp.endDate ? camp.endDate.split("T")[0] : "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Please enter a campaign title", "error");
      return;
    }

    startTransition(async () => {
      const res = await saveCampaignAction({
        id: editingCampaign?.id,
        title,
        description,
        multiplier: Number(multiplier) || 1,
        bonusPoints: Number(bonusPoints) || 0,
        status,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (res.success && res.campaign) {
        showToast(res.message, "success");
        setModalOpen(false);
        setCampaigns((prev) => {
          const idx = prev.findIndex((c) => c.id === res.campaign!.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = res.campaign!;
            return next;
          }
          return [res.campaign!, ...prev];
        });
      } else {
        showToast(res.error || "Failed to save campaign", "error");
      }
    });
  };

  const handleDelete = async (id: string, campTitle: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${campTitle}"?`)) return;

    startTransition(async () => {
      const res = await deleteCampaignAction(id);
      if (res.success) {
        showToast(`Campaign "${campTitle}" deleted`, "success");
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
      } else {
        showToast(res.error || "Failed to delete campaign", "error");
      }
    });
  };

  const handleToggleStatus = async (id: string, current: string) => {
    const nextStatus = current === "active" ? "paused" : "active";
    startTransition(async () => {
      const res = await toggleCampaignStatusAction(id, nextStatus as any);
      if (res.success) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: nextStatus as any } : c))
        );
        showToast(`Status changed to ${nextStatus}`, "success");
      } else {
        showToast(res.error || "Failed to update status", "error");
      }
    });
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <div className="admin-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="admin-page-title">Promotional Campaigns</h1>
          <p className="admin-page-desc" style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
            Create and run reward multipliers, seasonal challenges, and promotional point events.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openCreateModal}>
          + New Campaign
        </button>
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

      {/* Toolbar */}
      <div className="admin-toolbar" style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "active", "scheduled", "paused", "completed"].map((tab) => (
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

        <input
          type="text"
          placeholder="Search campaigns..."
          className="admin-form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "260px" }}
        />
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Reward Multiplier</th>
              <th>Bonus Pts</th>
              <th>Period</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
                  No campaigns found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredCampaigns.map((camp) => (
                <tr key={camp.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
                      {camp.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: 2, maxWidth: 360 }}>
                      {camp.description}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "#93c5fd",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                      }}
                    >
                      {camp.multiplier}x Multiplier
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "#86efac" }}>
                    +{camp.bonusPoints.toLocaleString()} pts
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {formatDate(camp.startDate)} – {formatDate(camp.endDate)}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background:
                          camp.status === "active"
                            ? "rgba(34, 197, 94, 0.15)"
                            : camp.status === "scheduled"
                            ? "rgba(59, 130, 246, 0.15)"
                            : camp.status === "paused"
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(107, 114, 128, 0.2)",
                        color:
                          camp.status === "active"
                            ? "#86efac"
                            : camp.status === "scheduled"
                            ? "#93c5fd"
                            : camp.status === "paused"
                            ? "#fde68a"
                            : "#9ca3af",
                        border: `1px solid ${
                          camp.status === "active"
                            ? "rgba(34, 197, 94, 0.3)"
                            : camp.status === "scheduled"
                            ? "rgba(59, 130, 246, 0.3)"
                            : camp.status === "paused"
                            ? "rgba(245, 158, 11, 0.3)"
                            : "rgba(107, 114, 128, 0.3)"
                        }`,
                      }}
                    >
                      {camp.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        className="admin-btn-action"
                        style={{ fontSize: "12px", color: camp.status === "active" ? "#fde68a" : "#86efac" }}
                        onClick={() => handleToggleStatus(camp.id, camp.status)}
                        disabled={isPending}
                        title="Toggle active status"
                      >
                        {camp.status === "active" ? "Pause" : "Activate"}
                      </button>

                      <button
                        type="button"
                        className="admin-btn-action"
                        style={{ fontSize: "12px", color: "#93c5fd" }}
                        onClick={() => openEditModal(camp)}
                        disabled={isPending}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="admin-btn-action"
                        style={{ fontSize: "12px", color: "#f87171" }}
                        onClick={() => handleDelete(camp.id, camp.title)}
                        disabled={isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
              maxWidth: "540px",
              background: "#111827",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                {editingCampaign ? "Edit Campaign" : "Create New Campaign"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="admin-form-label">Campaign Title</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fall Mega Multiplier 2x"
                  required
                />
              </div>

              <div>
                <label className="admin-form-label">Description</label>
                <textarea
                  className="admin-form-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe promotional bonus and qualifying requirements..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="admin-form-label">Multiplier Factor</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    className="admin-form-input"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="admin-form-label">Bonus Points</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    className="admin-form-input"
                    value={bonusPoints}
                    onChange={(e) => setBonusPoints(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="admin-form-label">Start Date</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="admin-form-label">End Date</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="admin-form-label">Initial Status</label>
                <select
                  className="admin-form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="active">Active</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
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
                  {isPending ? "Saving..." : editingCampaign ? "Update Campaign" : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
