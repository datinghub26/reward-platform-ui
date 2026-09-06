"use client";

import React, { useState, useMemo, useTransition } from "react";
import { CashoutMethod } from "@/lib/cashouts";
import {
  toggleCashoutMethodAction,
  updateCashoutMethodAction,
  createCashoutMethodAction,
  deleteCashoutMethodAction,
} from "./actions";

interface CashoutMethodsManagerProps {
  initialMethods: CashoutMethod[];
}

export default function CashoutMethodsManager({
  initialMethods,
}: CashoutMethodsManagerProps) {
  const [methods, setMethods] = useState<CashoutMethod[]>(initialMethods);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<CashoutMethod | null>(null);

  // New Method Form
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Crypto");
  const [newFee, setNewFee] = useState("0%");
  const [newMin, setNewMin] = useState(100);

  // Edit Form
  const [editTitle, setEditTitle] = useState("");
  const [editFee, setEditFee] = useState("0%");
  const [editMin, setEditMin] = useState(100);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredMethods = useMemo(() => {
    if (!search.trim()) return methods;
    const q = search.toLowerCase();
    return methods.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.payment_title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [methods, search]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggle = (id: string) => {
    startTransition(async () => {
      // Optimistic update
      setMethods((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: !m.status } : m))
      );
      const res = await toggleCashoutMethodAction(id);
      if (!res.success) {
        // Revert on error
        setMethods((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: !m.status } : m))
        );
        showToast(res.error || "Failed to toggle method", "error");
      } else {
        showToast(`Method status updated!`, "success");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this cashout method?")) return;
    startTransition(async () => {
      const res = await deleteCashoutMethodAction(id);
      if (res.success) {
        setMethods((prev) => prev.filter((m) => m.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast("Cashout method deleted.", "success");
      } else {
        showToast(res.error || "Failed to delete method", "error");
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} cashout methods?`)) return;
    startTransition(async () => {
      for (const id of selectedIds) {
        await deleteCashoutMethodAction(id);
      }
      setMethods((prev) => prev.filter((m) => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
      showToast("Selected cashout methods deleted.", "success");
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredMethods.map((m) => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    startTransition(async () => {
      const res = await createCashoutMethodAction({
        name: newName.trim(),
        logo: newCategory === "Fiat" ? "🅿️" : "💎",
        category: newCategory,
        bg_color: newCategory === "Fiat" ? "#003087" : "#162033",
        payment_title: newTitle.trim() || `Enter your ${newName.trim()} address`,
        status: true,
        fee: newFee.trim() || "0%",
        minimum: Number(newMin) || 100,
      });

      if (res.success && res.method) {
        setMethods((prev) => [...prev, res.method!]);
        setNewName("");
        setNewTitle("");
        setShowNewModal(false);
        showToast(`Cashout method ${res.method.name} added!`, "success");
      } else {
        showToast(res.error || "Failed to create method", "error");
      }
    });
  };

  const handleOpenEdit = (method: CashoutMethod) => {
    setEditingMethod(method);
    setEditTitle(method.payment_title);
    setEditFee(method.fee);
    setEditMin(method.minimum);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;

    startTransition(async () => {
      const res = await updateCashoutMethodAction(editingMethod.id, {
        payment_title: editTitle.trim(),
        fee: editFee.trim(),
        minimum: Number(editMin) || 100,
      });

      if (res.success && res.method) {
        setMethods((prev) =>
          prev.map((m) => (m.id === editingMethod.id ? res.method! : m))
        );
        setEditingMethod(null);
        showToast(`Cashout method ${res.method.name} updated!`, "success");
      } else {
        showToast(res.error || "Failed to update method", "error");
      }
    });
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Cashout Methods</h1>
        <button
          className="admin-btn-pill"
          onClick={() => setShowNewModal(true)}
        >
          + New Cashout Method
        </button>
      </div>

      {toast && (
        <div
          style={{
            padding: "12px 18px",
            backgroundColor:
              toast.type === "success"
                ? "rgba(34, 197, 94, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${
              toast.type === "success"
                ? "rgba(34, 197, 94, 0.35)"
                : "rgba(239, 68, 68, 0.35)"
            }`,
            borderRadius: "8px",
            color: toast.type === "success" ? "#4ade80" : "#f87171",
            fontSize: "13px",
            fontWeight: 500,
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="admin-table-container">
        <div
          className="admin-table-toolbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--admin-border-subtle)",
          }}
        >
          <div>
            {selectedIds.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "var(--admin-text-muted)", fontWeight: 600 }}>
                  {selectedIds.size} selected:
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleBulkDelete}
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    color: "#f87171",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: "6px",
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="admin-search-input-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search methods, titles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredMethods.length > 0 &&
                      selectedIds.size === filteredMethods.length
                    }
                  />
                </th>
                <th>Method</th>
                <th>Category</th>
                <th>Payment Title</th>
                <th>Minimum</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMethods.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "48px 16px",
                      color: "var(--admin-text-dim)",
                    }}
                  >
                    No cashout methods found.
                  </td>
                </tr>
              ) : (
                filteredMethods.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => handleSelectOne(m.id)}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>{m.logo}</span>
                        <strong style={{ color: "#ffffff", fontSize: "14px" }}>
                          {m.name}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <span className="admin-pill pill-code">{m.category}</span>
                    </td>
                    <td style={{ color: "var(--admin-text-dim)", fontSize: "13px" }}>
                      {m.payment_title}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--admin-green)" }}>
                      {m.minimum.toLocaleString()} pts (${(m.minimum / 1000).toFixed(2)})
                    </td>
                    <td style={{ color: "#ffffff", fontWeight: 600 }}>{m.fee}</td>
                    <td>
                      <label className="admin-switch">
                        <input
                          type="checkbox"
                          checked={m.status}
                          onChange={() => handleToggle(m.id)}
                        />
                        <span className="admin-switch-slider" />
                      </label>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="admin-action-btn action-green"
                          title="Edit Cashout Method"
                          onClick={() => handleOpenEdit(m)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          </svg>
                          <span>Edit</span>
                        </button>
                        <button
                          className="admin-action-btn action-red"
                          title="Delete Method"
                          disabled={isPending}
                          onClick={() => handleDelete(m.id)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <div>
            Showing {filteredMethods.length} of {methods.length} methods
          </div>
        </div>
      </div>

      {/* Edit Method Modal */}
      {editingMethod && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--admin-card)",
              border: "1px solid var(--admin-border)",
              borderRadius: "14px",
              padding: "28px",
              width: "480px",
              maxWidth: "92%",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#ffffff", fontSize: "18px" }}>
              Edit Cashout Method: {editingMethod.name}
            </h3>
            <form onSubmit={handleSaveEdit}>
              <div className="admin-form-group">
                <label className="admin-form-label">Payment Title / Prompt</label>
                <input
                  type="text"
                  className="admin-form-input"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Minimum Points</label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  className="admin-form-input"
                  required
                  value={editMin}
                  onChange={(e) => setEditMin(Number(e.target.value))}
                />
                <div className="admin-form-help">
                  ${(Number(editMin || 0) / 1000).toFixed(2)} minimum cashout amount
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Fee Percentage</label>
                <input
                  type="text"
                  className="admin-form-input"
                  required
                  value={editFee}
                  onChange={(e) => setEditFee(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="admin-tab"
                  onClick={() => setEditingMethod(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="admin-btn-pill"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Method Modal */}
      {showNewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--admin-card)",
              border: "1px solid var(--admin-border)",
              borderRadius: "14px",
              padding: "28px",
              width: "480px",
              maxWidth: "92%",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#ffffff", fontSize: "18px" }}>
              New Cashout Method
            </h3>
            <form onSubmit={handleCreate}>
              <div className="admin-form-group">
                <label className="admin-form-label">Method Name *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Bitcoin (BTC) or Revolut"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Category</label>
                <select
                  className="admin-form-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="Crypto">Crypto</option>
                  <option value="Fiat">Fiat</option>
                  <option value="Gift Card">Gift Card</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Payment Title / Prompt</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Enter your BTC address"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Minimum Points</label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  className="admin-form-input"
                  value={newMin}
                  onChange={(e) => setNewMin(Number(e.target.value))}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Fee</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="0%"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="admin-tab"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="admin-btn-pill"
                >
                  {isPending ? "Creating..." : "Create Method"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}