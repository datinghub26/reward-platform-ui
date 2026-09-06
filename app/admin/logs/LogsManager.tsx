"use client";

import React, { useState } from "react";

export interface UnifiedLogRecord {
  id: string;
  timestamp: string;
  category: "admin" | "postback" | "withdrawal" | "ledger" | "security";
  action: string;
  user: string;
  details: string;
  status: "success" | "pending" | "failed" | "reversed" | "warning";
  metadata?: string;
}

interface LogsManagerProps {
  initialLogs: UnifiedLogRecord[];
}

export default function LogsManager({ initialLogs }: LogsManagerProps) {
  const [logs] = useState<UnifiedLogRecord[]>(initialLogs);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const filteredLogs = logs.filter((log) => {
    if (filter !== "all" && log.category !== filter) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q) ||
      (log.metadata && log.metadata.toLowerCase().includes(q))
    );
  });

  const totalAdminActions = logs.filter((l) => l.category === "admin").length;
  const totalPostbacks = logs.filter((l) => l.category === "postback").length;
  const totalWithdrawals = logs.filter((l) => l.category === "withdrawal").length;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "admin":
        return { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)" };
      case "postback":
        return { bg: "rgba(34, 197, 94, 0.15)", text: "#86efac", border: "rgba(34, 197, 94, 0.3)" };
      case "withdrawal":
        return { bg: "rgba(234, 179, 8, 0.15)", text: "#fde047", border: "rgba(234, 179, 8, 0.3)" };
      case "ledger":
        return { bg: "rgba(59, 130, 246, 0.15)", text: "#93c5fd", border: "rgba(59, 130, 246, 0.3)" };
      default:
        return { bg: "rgba(107, 114, 128, 0.15)", text: "#9ca3af", border: "rgba(107, 114, 128, 0.3)" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <span style={{ color: "#4ade80", fontWeight: 600 }}>✓ Completed</span>;
      case "pending":
        return <span style={{ color: "#facc15", fontWeight: 600 }}>⏳ Pending</span>;
      case "failed":
      case "reversed":
        return <span style={{ color: "#f87171", fontWeight: 600 }}>✕ {status.toUpperCase()}</span>;
      default:
        return <span style={{ color: "#94a3b8" }}>{status}</span>;
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">System & Audit Logs</h1>
        <p className="admin-page-desc" style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
          Live unified audit trail of administrative modifications, postback conversions, withdrawals, and ledger events.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Logged Events</div>
          <div className="admin-stat-val">{logs.length}</div>
          <div className="admin-stat-sub sub-blue">
            <span>Aggregated across all platform modules</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Admin Actions</div>
          <div className="admin-stat-val">{totalAdminActions}</div>
          <div className="admin-stat-sub sub-purple">
            <span>Settings, campaigns, and configuration edits</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Financial Activity</div>
          <div className="admin-stat-val">{totalPostbacks + totalWithdrawals}</div>
          <div className="admin-stat-sub sub-green">
            <span>{totalPostbacks} postbacks, {totalWithdrawals} withdrawals</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar" style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Logs" },
            { id: "admin", label: "Admin Audits" },
            { id: "postback", label: "Postbacks" },
            { id: "withdrawal", label: "Withdrawals" },
            { id: "ledger", label: "Ledger" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-btn ${filter === tab.id ? "admin-btn-primary" : ""}`}
              style={{ fontSize: "13px", padding: "6px 14px" }}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search logs by action, user..."
          className="admin-form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "280px" }}
        />
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "16%" }}>Timestamp</th>
              <th style={{ width: "12%" }}>Category</th>
              <th style={{ width: "20%" }}>Action / Event</th>
              <th style={{ width: "18%" }}>Initiator / User</th>
              <th style={{ width: "22%" }}>Details</th>
              <th style={{ width: "12%", textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
                  No system log records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const catStyle = getCategoryColor(log.category);

                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {formatDate(log.timestamp)}
                    </td>

                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background: catStyle.bg,
                          color: catStyle.text,
                          border: `1px solid ${catStyle.border}`,
                        }}
                      >
                        {log.category}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "13px" }}>
                        {log.action}
                      </div>
                      {log.metadata && (
                        <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>
                          {log.metadata}
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: "13px", color: "#e2e8f0" }}>
                        {log.user}
                      </div>
                    </td>

                    <td>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#cbd5e1",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {log.details}
                      </div>
                    </td>

                    <td style={{ textAlign: "right", fontSize: "12px" }}>
                      {getStatusBadge(log.status)}
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
