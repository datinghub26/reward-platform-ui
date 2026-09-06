"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { NavbarButton } from "@/lib/navbar-buttons";
import {
  saveNavbarButtonAction,
  deleteNavbarButtonAction,
  toggleNavbarButtonAction,
} from "./actions";

interface NavbarButtonsManagerProps {
  initialButtons: NavbarButton[];
}

export default function NavbarButtonsManager({
  initialButtons,
}: NavbarButtonsManagerProps) {
  const [buttons, setButtons] = useState<NavbarButton[]>(initialButtons);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingButton, setEditingButton] = useState<NavbarButton | null>(null);

  // Form State
  const [formId, setFormId] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formIsExternal, setFormIsExternal] = useState(false);
  const [formOrder, setFormOrder] = useState(1);
  const [formActive, setFormActive] = useState(true);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingButton(null);
    setFormId("");
    setFormLabel("");
    setFormUrl("");
    setFormIcon("🔗");
    setFormBadge("");
    setFormIsExternal(false);
    setFormOrder(buttons.length + 1);
    setFormActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (btn: NavbarButton) => {
    setModalMode("edit");
    setEditingButton(btn);
    setFormId(btn.id);
    setFormLabel(btn.label);
    setFormUrl(btn.url);
    setFormIcon(btn.icon || "");
    setFormBadge(btn.badge || "");
    setFormIsExternal(Boolean(btn.isExternal));
    setFormOrder(btn.order || 0);
    setFormActive(btn.active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingButton(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      showToast("Button label is required", "error");
      return;
    }
    if (!formUrl.trim()) {
      showToast("Target URL is required", "error");
      return;
    }

    const payload: NavbarButton = {
      id: formId || `btn_${Date.now()}`,
      label: formLabel.trim(),
      url: formUrl.trim(),
      icon: formIcon.trim(),
      badge: formBadge.trim(),
      isExternal: formIsExternal,
      order: Number(formOrder) || 0,
      active: formActive,
    };

    startTransition(async () => {
      const res = await saveNavbarButtonAction(payload);
      if (res.success) {
        showToast(res.message || "Button saved successfully", "success");
        setButtons((prev) => {
          const index = prev.findIndex((b) => b.id === payload.id);
          let nextList = [...prev];
          if (index >= 0) {
            nextList[index] = payload;
          } else {
            nextList.push(payload);
          }
          return nextList.sort((a, b) => a.order - b.order);
        });
        closeModal();
      } else {
        showToast(res.error || "Failed to save button", "error");
      }
    });
  };

  const handleToggle = (btn: NavbarButton) => {
    const nextState = !btn.active;
    startTransition(async () => {
      const res = await toggleNavbarButtonAction(btn.id, nextState, btn.label);
      if (res.success) {
        setButtons((prev) =>
          prev.map((b) => (b.id === btn.id ? { ...b, active: nextState } : b))
        );
        showToast(res.message || "State updated", "success");
      } else {
        showToast(res.error || "Failed to toggle button", "error");
      }
    });
  };

  const handleDelete = (btn: NavbarButton) => {
    if (!confirm(`Are you sure you want to delete "${btn.label}"?`)) return;

    startTransition(async () => {
      const res = await deleteNavbarButtonAction(btn.id, btn.label);
      if (res.success) {
        setButtons((prev) => prev.filter((b) => b.id !== btn.id));
        showToast(res.message || "Button deleted", "success");
      } else {
        showToast(res.error || "Failed to delete button", "error");
      }
    });
  };

  const filteredButtons = buttons.filter((b) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      b.label.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q) ||
      (b.badge && b.badge.toLowerCase().includes(q))
    );
  });

  const activeButtonsCount = buttons.filter((b) => b.active).length;
  const externalCount = buttons.filter((b) => b.isExternal).length;

  return (
    <div>
      {/* Breadcrumb & Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
            Navbar Buttons &rsaquo; <span style={{ color: "#ffffff" }}>List</span>
          </div>
          <h1 className="admin-page-title" style={{ margin: 0 }}>Navbar Buttons</h1>
          <p className="admin-page-desc" style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
            Customize global navigation buttons, external links, promotional badges, and sort orders.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="admin-btn admin-btn-outline"
          style={{ fontSize: "12px", padding: "6px 14px" }}
        >
          &larr; Member View
        </Link>
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
          <div className="admin-stat-label">Total Buttons</div>
          <div className="admin-stat-val">{buttons.length}</div>
          <div className="admin-stat-sub sub-blue">
            <span>Configured navigation targets</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Active in Navigation</div>
          <div className="admin-stat-val">{activeButtonsCount}</div>
          <div className="admin-stat-sub sub-green">
            <span>Currently visible to users</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">External Destinations</div>
          <div className="admin-stat-val">{externalCount}</div>
          <div className="admin-stat-sub sub-yellow">
            <span>Opens in new browser tab</span>
          </div>
        </div>
      </div>

      {/* Live Preview Box */}
      <div
        className="admin-card"
        style={{
          marginBottom: 24,
          padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontWeight: 600 }}>
            Live Navigation Bar Preview
          </span>
          <span style={{ fontSize: "11px", color: "#60a5fa" }}>Preview updates automatically</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            padding: "12px 16px",
            background: "rgba(10, 15, 29, 0.8)",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          {buttons.filter((b) => b.active).length === 0 ? (
            <span style={{ fontSize: "13px", color: "var(--muted)", fontStyle: "italic" }}>
              No active buttons enabled. Navigation bar is empty.
            </span>
          ) : (
            buttons
              .filter((b) => b.active)
              .sort((a, b) => a.order - b.order)
              .map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#ffffff",
                    fontWeight: 500,
                  }}
                >
                  {b.icon && <span>{b.icon}</span>}
                  <span>{b.label}</span>
                  {b.badge && (
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background: "rgba(99, 102, 241, 0.25)",
                        color: "#818cf8",
                        border: "1px solid rgba(99, 102, 241, 0.4)",
                      }}
                    >
                      {b.badge}
                    </span>
                  )}
                  {b.isExternal && (
                    <span style={{ fontSize: "10px", opacity: 0.6 }} title="External URL">
                      ↗
                    </span>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar" style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search buttons..."
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
          + Add New Button
        </button>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>Order</th>
              <th style={{ width: "24%" }}>Button & Icon</th>
              <th style={{ width: "26%" }}>Target Route / URL</th>
              <th style={{ width: "12%" }}>Badge</th>
              <th style={{ width: "10%" }}>Target</th>
              <th style={{ width: "10%" }}>Status</th>
              <th style={{ width: "10%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredButtons.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
                  No navbar buttons found matching search criteria.
                </td>
              </tr>
            ) : (
              filteredButtons.map((btn) => (
                <tr key={btn.id}>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.05)",
                        fontWeight: 600,
                        fontSize: "12px",
                      }}
                    >
                      {btn.order}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {btn.icon && (
                        <span style={{ fontSize: "18px" }}>
                          {btn.icon}
                        </span>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
                          {btn.label}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          ID: {btn.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "#93c5fd",
                        wordBreak: "break-all",
                      }}
                    >
                      {btn.url}
                    </span>
                  </td>

                  <td>
                    {btn.badge ? (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: "rgba(99, 102, 241, 0.2)",
                          color: "#818cf8",
                          border: "1px solid rgba(99, 102, 241, 0.35)",
                        }}
                      >
                        {btn.badge}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                    )}
                  </td>

                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: btn.isExternal ? "rgba(234, 179, 8, 0.15)" : "rgba(107, 114, 128, 0.2)",
                        color: btn.isExternal ? "#facc15" : "#9ca3af",
                      }}
                    >
                      {btn.isExternal ? "New Tab (_blank)" : "Self (_self)"}
                    </span>
                  </td>

                  <td>
                    <label
                      style={{
                        position: "relative",
                        display: "inline-block",
                        width: "44px",
                        height: "24px",
                        cursor: isPending ? "not-allowed" : "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={btn.active}
                        onChange={() => handleToggle(btn)}
                        disabled={isPending}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          cursor: "pointer",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: btn.active ? "#22c55e" : "#334155",
                          transition: "0.2s",
                          borderRadius: "24px",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            content: '""',
                            height: "18px",
                            width: "18px",
                            left: btn.active ? "23px" : "3px",
                            bottom: "3px",
                            backgroundColor: "white",
                            transition: "0.2s",
                            borderRadius: "50%",
                          }}
                        />
                      </span>
                    </label>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(btn)}
                        className="admin-btn admin-btn-outline"
                        style={{ padding: "4px 10px", fontSize: "12px" }}
                        disabled={isPending}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(btn)}
                        className="admin-btn admin-btn-danger"
                        style={{ padding: "4px 10px", fontSize: "12px" }}
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

      {/* Modal Dialog */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "14px",
              padding: "28px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", color: "#ffffff", fontWeight: 700 }}>
                {modalMode === "create" ? "Add Navigation Button" : `Edit Button: ${editingButton?.label}`}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="admin-form-label" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 500 }}>
                    Button Label <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. Earn, Leaderboard, Discord"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label className="admin-form-label" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 500 }}>
                    Target URL / Route <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. /earn, /leaderboard, https://discord.gg/rewardnova"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                  />
                  <div style={{ marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {["/earn", "/leaderboard", "/withdraw", "/support", "https://discord.gg/rewardnova"].map((sugg) => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => setFormUrl(sugg)}
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          color: "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        {sugg}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="admin-form-label" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 500 }}>
                    Icon / Emoji
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. 💰, 🏆, 💬"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                  />
                </div>

                <div>
                  <label className="admin-form-label" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 500 }}>
                    Promotional Badge
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. HOT, NEW, +10%"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                  />
                </div>

                <div>
                  <label className="admin-form-label" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 500 }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    className="admin-form-input"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value) || 0)}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                    <input
                      type="checkbox"
                      checked={formIsExternal}
                      onChange={(e) => setFormIsExternal(e.target.checked)}
                      style={{ cursor: "pointer", accentColor: "#6366f1" }}
                    />
                    <span>Open in New Tab</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      style={{ cursor: "pointer", accentColor: "#22c55e" }}
                    />
                    <span>Active (Enabled)</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={closeModal}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : modalMode === "create" ? "Add Button" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
