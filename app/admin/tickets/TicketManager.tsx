"use client";

import React, { useState, useTransition } from "react";
import { updateTicketStatusAction, deleteTicketAction } from "./actions";

export interface TicketItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
  updatedAt: string;
}

interface TicketManagerProps {
  initialTickets: TicketItem[];
}

export default function TicketManager({ initialTickets }: TicketManagerProps) {
  const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [targetStatus, setTargetStatus] = useState<"open" | "in_progress" | "resolved" | "closed">("resolved");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openTicketModal = (t: TicketItem) => {
    setSelectedTicket(t);
    setReplyText("");
    setTargetStatus(t.status === "open" ? "in_progress" : t.status);
  };

  const handleUpdateStatus = async (ticketId: string, status: "open" | "in_progress" | "resolved" | "closed") => {
    startTransition(async () => {
      const res = await updateTicketStatusAction(ticketId, status);
      if (res.success) {
        showToast(res.message || "Status updated", "success");
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
        );
      } else {
        showToast(res.error || "Failed to update status", "error");
      }
    });
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    startTransition(async () => {
      const res = await updateTicketStatusAction(selectedTicket.id, targetStatus, replyText);
      if (res.success) {
        showToast("Response sent and ticket status updated!", "success");
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: targetStatus } : t))
        );
        setSelectedTicket(null);
      } else {
        showToast(res.error || "Failed to submit response", "error");
      }
    });
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;

    startTransition(async () => {
      const res = await deleteTicketAction(ticketId);
      if (res.success) {
        showToast("Ticket deleted", "success");
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      } else {
        showToast(res.error || "Failed to delete ticket", "error");
      }
    });
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesFilter = filter === "all" || t.status === filter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.subject.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q) ||
      t.userName.toLowerCase().includes(q) ||
      t.userEmail.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const totalOpen = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const totalResolved = tickets.filter((t) => t.status === "resolved").length;

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

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Support Tickets</h1>
        <p className="admin-page-desc" style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
          Review, respond to, and resolve user inquiries and offer dispute tickets.
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

      {/* Metrics Grid */}
      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Tickets</div>
          <div className="admin-stat-val">{tickets.length}</div>
          <div className="admin-stat-sub sub-blue">
            <span>All time member inquiries</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Awaiting Action</div>
          <div className="admin-stat-val">{totalOpen}</div>
          <div className="admin-stat-sub sub-yellow">
            <span>Open or in-progress tickets</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Resolved</div>
          <div className="admin-stat-val">{totalResolved}</div>
          <div className="admin-stat-sub sub-green">
            <span>Successfully answered</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar" style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "open", "in_progress", "resolved", "closed"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`admin-btn ${filter === tab ? "admin-btn-primary" : ""}`}
              style={{ textTransform: "capitalize", fontSize: "13px", padding: "6px 14px" }}
              onClick={() => setFilter(tab)}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search tickets or users..."
          className="admin-form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "260px" }}
        />
      </div>

      {/* Tickets Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "22%" }}>User</th>
              <th style={{ width: "38%" }}>Subject & Details</th>
              <th style={{ width: "14%" }}>Status</th>
              <th style={{ width: "14%" }}>Submitted</th>
              <th style={{ width: "12%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  No support tickets found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredTickets.map((t) => {
                const isResolved = t.status === "resolved";
                const isOpen = t.status === "open";
                const isInProgress = t.status === "in_progress";

                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
                        {t.userName}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {t.userEmail}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: "#93c5fd", fontSize: "14px", cursor: "pointer" }} onClick={() => openTicketModal(t)}>
                        {t.subject}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginTop: "2px",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {t.message}
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background: isResolved
                            ? "rgba(34, 197, 94, 0.15)"
                            : isOpen
                            ? "rgba(239, 68, 68, 0.15)"
                            : isInProgress
                            ? "rgba(59, 130, 246, 0.15)"
                            : "rgba(107, 114, 128, 0.2)",
                          color: isResolved
                            ? "#86efac"
                            : isOpen
                            ? "#fca5a5"
                            : isInProgress
                            ? "#93c5fd"
                            : "#9ca3af",
                          border: `1px solid ${
                            isResolved
                              ? "rgba(34, 197, 94, 0.3)"
                              : isOpen
                              ? "rgba(239, 68, 68, 0.3)"
                              : isInProgress
                              ? "rgba(59, 130, 246, 0.3)"
                              : "rgba(107, 114, 128, 0.3)"
                          }`,
                        }}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </td>

                    <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {formatDate(t.createdAt)}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                        <button
                          type="button"
                          className="admin-btn-action"
                          style={{ fontSize: "12px", color: "#93c5fd" }}
                          onClick={() => openTicketModal(t)}
                          disabled={isPending}
                        >
                          Respond
                        </button>

                        {!isResolved ? (
                          <button
                            type="button"
                            className="admin-btn-action"
                            style={{ fontSize: "12px", color: "#86efac" }}
                            onClick={() => handleUpdateStatus(t.id, "resolved")}
                            disabled={isPending}
                            title="Quick mark as resolved"
                          >
                            Resolve
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn-action"
                            style={{ fontSize: "12px", color: "#fde68a" }}
                            onClick={() => handleUpdateStatus(t.id, "closed")}
                            disabled={isPending}
                          >
                            Close
                          </button>
                        )}

                        <button
                          type="button"
                          className="admin-btn-action"
                          style={{ fontSize: "12px", color: "#f87171" }}
                          onClick={() => handleDelete(t.id)}
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

      {/* Ticket Reply Modal */}
      {selectedTicket && (
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
          onClick={(e) => e.target === e.currentTarget && !isPending && setSelectedTicket(null)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "560px",
              background: "#111827",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span className="badge" style={{ fontSize: "11px", marginBottom: "4px" }}>
                  Ticket #{selectedTicket.id.slice(0, 8)}
                </span>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                  {selectedTicket.subject}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "14px 16px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)", marginBottom: 8 }}>
                <span>From: <strong>{selectedTicket.userName}</strong> ({selectedTicket.userEmail})</span>
                <span>{formatDate(selectedTicket.createdAt)}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#e2e8f0", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                {selectedTicket.message}
              </div>
            </div>

            <form onSubmit={handleSendReply} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="admin-form-label">Admin Response (Sent to User Inbox)</label>
                <textarea
                  className="admin-form-input"
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to the user. This message will be sent as an account notification..."
                  required
                />
              </div>

              <div>
                <label className="admin-form-label">Set Ticket Status</label>
                <select
                  className="admin-form-input"
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                >
                  <option value="resolved">Resolved (Complete inquiry)</option>
                  <option value="in_progress">In Progress (Under investigation)</option>
                  <option value="closed">Closed (Archive)</option>
                  <option value="open">Open</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setSelectedTicket(null)}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isPending}
                >
                  {isPending ? "Sending..." : "Send Response & Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
