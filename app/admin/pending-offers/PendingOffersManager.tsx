"use client";

import React, { useState, useMemo, useTransition } from "react";
import { PendingOfferRule } from "@/lib/pending-rules";
import {
  createRuleAction,
  toggleRuleAction,
  deleteRuleAction,
} from "./actions";

interface PendingOffersManagerProps {
  initialRules: PendingOfferRule[];
}

export default function PendingOffersManager({
  initialRules,
}: PendingOffersManagerProps) {
  const [rules, setRules] = useState<PendingOfferRule[]>(initialRules);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNewModal, setShowNewModal] = useState(false);
  const [newOfferId, setNewOfferId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState("7 Days");
  const [newNotes, setNewNotes] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredRules = useMemo(() => {
    if (!search.trim()) return rules;
    const q = search.toLowerCase();
    return rules.filter(
      (r) =>
        r.offer_id.toLowerCase().includes(q) ||
        r.offer_title.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
    );
  }, [rules, search]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggle = (id: string) => {
    startTransition(async () => {
      // Optimistic update
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
      );
      const res = await toggleRuleAction(id);
      if (!res.success) {
        // Revert on error
        setRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
        );
        showToast(res.error || "Failed to toggle rule", "error");
      } else {
        showToast("Pending rule status updated!", "success");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this pending rule?")) return;
    startTransition(async () => {
      const res = await deleteRuleAction(id);
      if (res.success) {
        setRules((prev) => prev.filter((r) => r.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast("Pending rule deleted successfully.", "success");
      } else {
        showToast(res.error || "Failed to delete rule", "error");
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} pending offer rules?`)) return;
    startTransition(async () => {
      for (const id of selectedIds) {
        await deleteRuleAction(id);
      }
      setRules((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      showToast("Selected pending rules deleted successfully.", "success");
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredRules.map((r) => r.id)));
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
    if (!newOfferId.trim()) return;

    startTransition(async () => {
      const res = await createRuleAction({
        offer_id: newOfferId.trim(),
        offer_title: newTitle.trim() || "Custom / Direct ID",
        hold_duration: newDuration,
        notes: newNotes.trim() || "High risk offer",
      });

      if (res.success && res.rule) {
        setRules((prev) => [res.rule!, ...prev]);
        setNewOfferId("");
        setNewTitle("");
        setNewNotes("");
        setShowNewModal(false);
        showToast(`Rule for offer #${res.rule.offer_id} created and active!`, "success");
      } else {
        showToast(res.error || "Failed to create rule", "error");
      }
    });
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Pending Offer Rules</h1>
        <button
          className="admin-btn-pill"
          onClick={() => setShowNewModal(true)}
        >
          + New Pending Offer Rule
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
                placeholder="Search offer ID, title, notes..."
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
                      filteredRules.length > 0 &&
                      selectedIds.size === filteredRules.length
                    }
                  />
                </th>
                <th>Offer ID</th>
                <th>Offer Title</th>
                <th>Hold Duration</th>
                <th>Active</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "48px 16px",
                      color: "var(--admin-text-dim)",
                    }}
                  >
                    No pending offer rules configured. Click &quot;+ New Pending Offer Rule&quot; to hold specific offers for review.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rule.id)}
                        onChange={() => handleSelectOne(rule.id)}
                      />
                    </td>
                    <td>
                      <span className="admin-pill pill-code">
                        {rule.offer_id}
                      </span>
                    </td>
                    <td style={{ color: "#ffffff", fontWeight: 600 }}>
                      {rule.offer_title}
                    </td>
                    <td>
                      <span className="admin-pill pill-hold">
                        {rule.hold_duration}
                      </span>
                    </td>
                    <td>
                      <label className="admin-switch">
                        <input
                          type="checkbox"
                          checked={rule.active}
                          onChange={() => handleToggle(rule.id)}
                        />
                        <span className="admin-switch-slider" />
                      </label>
                    </td>
                    <td style={{ color: "var(--admin-text-dim)", fontSize: "13px" }}>
                      {rule.notes}
                    </td>
                    <td>
                      <button
                        className="admin-action-btn action-red"
                        title="Delete Rule"
                        disabled={isPending}
                        onClick={() => handleDelete(rule.id)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <div>
            Showing {filteredRules.length} of {rules.length} rules
          </div>
        </div>
      </div>

      {/* New Rule Modal */}
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
              maxWidth: "90%",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#ffffff", fontSize: "18px" }}>
              New Pending Offer Rule
            </h3>
            <form onSubmit={handleCreate}>
              <div className="admin-form-group">
                <label className="admin-form-label">Offer ID *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. 37352657 or high-payout-survey"
                  required
                  value={newOfferId}
                  onChange={(e) => setNewOfferId(e.target.value)}
                />
                <div className="admin-form-help">
                  Any conversion matching this offer ID will be held in pending status for verification.
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Offer Title / Description</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Finance App Install (High Payout)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Hold Duration</label>
                <select
                  className="admin-form-select"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                >
                  <option value="24 Hours">24 Hours</option>
                  <option value="3 Days">3 Days</option>
                  <option value="7 Days">7 Days</option>
                  <option value="14 Days">14 Days</option>
                  <option value="30 Days">30 Days</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Notes</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. High fraud risk, require advertiser confirmation"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
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
                  {isPending ? "Creating..." : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}