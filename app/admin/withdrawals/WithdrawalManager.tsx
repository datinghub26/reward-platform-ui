"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  updateWithdrawal,
  deleteWithdrawalAction,
  bulkUpdateWithdrawalsAction,
  WithdrawalStatus,
} from "./actions";

export type Withdrawal = {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  amount_usd: number;
  amount_points?: number;
  payment_method: string;
  payment_details: {
    value?: string;
    [key: string]: unknown;
  } | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at?: string;
  processed_at?: string | null;
};

type Props = {
  withdrawals: Withdrawal[];
};

export default function WithdrawalManager({ withdrawals }: Props) {
  const [items, setItems] = useState<Withdrawal[]>(withdrawals);
  const [activeTab, setActiveTab] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<Withdrawal | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allRecords = items;

  const pendingCount = allRecords.filter((r) => r.status === "pending").length;
  const approvedCount = allRecords.filter(
    (r) => r.status === "approved" || r.status === "paid" || r.status === "processing"
  ).length;
  const rejectedCount = allRecords.filter((r) => r.status === "rejected").length;

  const filteredRecords = useMemo(() => {
    return allRecords.filter((item) => {
      if (activeTab === "Pending" && item.status !== "pending") return false;
      if (
        activeTab === "Approved" &&
        item.status !== "approved" &&
        item.status !== "paid" &&
        item.status !== "processing"
      )
        return false;
      if (activeTab === "Rejected" && item.status !== "rejected") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const userStr = (item.user_name || item.user_id).toLowerCase();
        const emailStr = (item.user_email || "").toLowerCase();
        const methodStr = item.payment_method.toLowerCase();
        const addrStr = String(item.payment_details?.value || "").toLowerCase();
        return (
          userStr.includes(q) ||
          emailStr.includes(q) ||
          methodStr.includes(q) ||
          addrStr.includes(q)
        );
      }
      return true;
    });
  }, [allRecords, activeTab, search]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApproveQuick = (item: Withdrawal) => {
    startTransition(async () => {
      const res = await updateWithdrawal(item.id, "paid", "Approved via Quick Action");
      if (res.success) {
        setItems((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, status: "paid" } : r))
        );
        showToast(`Request #${item.id.slice(0, 8)} approved and marked Paid!`, "success");
      } else {
        showToast(res.error || "Failed to approve request", "error");
      }
    });
  };

  const handleUpdateStatus = (status: WithdrawalStatus) => {
    if (!editingItem) return;
    startTransition(async () => {
      const res = await updateWithdrawal(editingItem.id, status, adminNote);
      if (res.success) {
        setItems((prev) =>
          prev.map((r) =>
            r.id === editingItem.id
              ? { ...r, status, admin_note: adminNote || null }
              : r
          )
        );
        showToast(
          status === "rejected"
            ? `Request #${editingItem.id.slice(0, 8)} rejected. Points refunded to user!`
            : `Request updated to ${status}.`,
          "success"
        );
        setEditingItem(null);
      } else {
        showToast(res.error || "Failed to update request", "error");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this withdrawal request? Any pending points will be automatically refunded.")) {
      return;
    }
    startTransition(async () => {
      const res = await deleteWithdrawalAction(id);
      if (res.success) {
        setItems((prev) => prev.filter((r) => r.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast("Withdrawal deleted successfully.", "success");
      } else {
        showToast(res.error || "Failed to delete withdrawal", "error");
      }
    });
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      const res = await bulkUpdateWithdrawalsAction(
        Array.from(selectedIds),
        "paid",
        "Approved in bulk action"
      );
      if (res.success) {
        setItems((prev) =>
          prev.map((r) => (selectedIds.has(r.id) ? { ...r, status: "paid" } : r))
        );
        showToast(`${res.count} requests approved and marked Paid!`, "success");
        setSelectedIds(new Set());
      } else {
        showToast(res.error || "Bulk approve failed", "error");
      }
    });
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to reject ${selectedIds.size} requests? Points will be refunded to users.`)) {
      return;
    }
    startTransition(async () => {
      const res = await bulkUpdateWithdrawalsAction(
        Array.from(selectedIds),
        "rejected",
        "Bulk rejection by administrator"
      );
      if (res.success) {
        setItems((prev) =>
          prev.map((r) => (selectedIds.has(r.id) ? { ...r, status: "rejected" } : r))
        );
        showToast(`${res.count} requests rejected and points refunded!`, "success");
        setSelectedIds(new Set());
      } else {
        showToast(res.error || "Bulk reject failed", "error");
      }
    });
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Requests</h1>
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

      {/* 3 Metric Cards */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Pending Requests</div>
          <div className="admin-stat-val" style={{ color: "#fcd34d" }}>
            {pendingCount}
          </div>
          <div className="admin-stat-sub sub-yellow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Active requests waiting for admin review</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Approved Requests</div>
          <div className="admin-stat-val" style={{ color: "#4ade80" }}>
            {approvedCount}
          </div>
          <div className="admin-stat-sub sub-green">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <span>Total completed &amp; paid payouts</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Rejected Requests</div>
          <div className="admin-stat-val" style={{ color: "#f87171" }}>
            {rejectedCount}
          </div>
          <div className="admin-stat-sub sub-red">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>Total rejected requests (points refunded)</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <div
          style={{
            backgroundColor: "var(--admin-card-inner)",
            border: "1px solid var(--admin-border)",
            borderRadius: "20px",
            padding: "4px",
            display: "inline-flex",
            gap: "4px",
          }}
        >
          {(["All", "Pending", "Approved", "Rejected"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "#202a3c" : "none",
                color: activeTab === tab ? "#ffffff" : "var(--admin-text-muted)",
                border: "none",
                borderRadius: "16px",
                padding: "6px 16px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
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
          {/* Batch Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {selectedIds.size > 0 && (
              <>
                <span style={{ fontSize: "12px", color: "var(--admin-text-muted)", fontWeight: 600 }}>
                  {selectedIds.size} selected:
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleBulkApprove}
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.2)",
                    color: "#4ade80",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    borderRadius: "6px",
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Approve Selected
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleBulkReject}
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
                  Reject &amp; Refund Selected
                </button>
              </>
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
                placeholder="Search user, method, address..."
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
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    checked={
                      filteredRecords.length > 0 &&
                      selectedIds.size === filteredRecords.length
                    }
                  />
                </th>
                <th>User</th>
                <th>Method</th>
                <th>Points ⌄</th>
                <th>Amount (USD)</th>
                <th>Payout Destination</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: "48px 16px",
                      color: "var(--admin-text-dim)",
                    }}
                  >
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(req.id)}
                        onChange={() => {
                          const next = new Set(selectedIds);
                          if (next.has(req.id)) next.delete(req.id);
                          else next.add(req.id);
                          setSelectedIds(next);
                        }}
                      />
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar">
                          {(req.user_name || req.user_id).charAt(0).toUpperCase()}
                        </div>
                        <div className="admin-user-meta">
                          <div className="admin-user-name">
                            {req.user_name || req.user_id.slice(0, 8)}
                          </div>
                          <div className="admin-user-email">
                            {req.user_email || `${req.user_id.slice(0, 8)}@user`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: "#ffffff" }}>
                      <span className="admin-pill pill-code">
                        {req.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--admin-green)" }}>
                      {(req.amount_points ?? req.amount_usd * 1000).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600, color: "#ffffff" }}>
                      ${Number(req.amount_usd).toFixed(2)}
                    </td>
                    <td style={{ maxWidth: "240px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            color: "#86efac",
                          }}
                        >
                          {req.payment_details?.value || "N/A"}
                        </span>
                        {req.payment_details?.value && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(req.payment_details!.value!, req.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: copiedId === req.id ? "#4ade80" : "var(--admin-text-dim)",
                              padding: "2px",
                            }}
                            title="Copy address"
                          >
                            {copiedId === req.id ? "✓" : "📋"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`admin-pill pill-${req.status}`}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "12px", color: "var(--admin-text-muted)" }}>
                      {req.created_at}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          className="admin-action-btn action-green"
                          title="Review / Edit Request"
                          onClick={() => {
                            setEditingItem(req);
                            setAdminNote(req.admin_note || "");
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          </svg>
                          <span>Review</span>
                        </button>

                        {req.status === "pending" && (
                          <button
                            className="admin-action-btn action-green"
                            title="Quick Approve"
                            disabled={isPending}
                            onClick={() => handleApproveQuick(req)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                        )}

                        <button
                          className="admin-action-btn action-red"
                          title="Delete Request"
                          disabled={isPending}
                          onClick={() => handleDelete(req.id)}
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
      </div>

      {/* Review Modal */}
      {editingItem && (
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
              width: "520px",
              maxWidth: "92%",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#ffffff", fontSize: "18px" }}>
              Review Cashout Request #{editingItem.id.slice(0, 8)}
            </h3>

            <div
              style={{
                marginBottom: "20px",
                fontSize: "13px",
                color: "var(--admin-text-muted)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                background: "var(--admin-card-inner)",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid var(--admin-border-subtle)",
              }}
            >
              <div>User: <strong style={{ color: "#ffffff" }}>{editingItem.user_name || editingItem.user_id}</strong> ({editingItem.user_email || "N/A"})</div>
              <div>Amount: <strong style={{ color: "var(--admin-green)" }}>${Number(editingItem.amount_usd).toFixed(2)}</strong> ({(editingItem.amount_points ?? editingItem.amount_usd * 1000).toLocaleString()} points)</div>
              <div>Payment Method: <strong style={{ color: "#ffffff" }}>{editingItem.payment_method.toUpperCase()}</strong></div>
              <div>
                Destination:{" "}
                <code style={{ color: "#86efac", wordBreak: "break-all" }}>
                  {editingItem.payment_details?.value || "N/A"}
                </code>
              </div>
              <div>Current Status: <span className={`admin-pill pill-${editingItem.status}`}>{editingItem.status}</span></div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                Admin Note / Reason / Transaction Hash
              </label>
              <textarea
                className="admin-form-input"
                style={{ height: "80px", resize: "none" }}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. TXID: 0x89ab12... or Rejection reason"
              />
              <div className="admin-form-help">
                If rejected, this note is delivered to the user and points are refunded automatically.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "24px",
              }}
            >
              <button
                type="button"
                className="admin-tab"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    color: "#f87171",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  disabled={isPending}
                  onClick={() => handleUpdateStatus("rejected")}
                >
                  Reject &amp; Refund
                </button>

                <button
                  type="button"
                  style={{
                    backgroundColor: "rgba(245, 158, 11, 0.2)",
                    color: "#fcd34d",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  disabled={isPending}
                  onClick={() => handleUpdateStatus("processing")}
                >
                  Processing
                </button>

                <button
                  type="button"
                  className="admin-btn-pill"
                  disabled={isPending}
                  onClick={() => handleUpdateStatus("paid")}
                >
                  Approve / Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}