"use client";

import React, { useState, useMemo } from "react";
import { reverseLeadAction, deleteLeadAction, bulkDeleteLeadsAction, getLeadDetailsAction } from "./actions";

export interface AdminLeadRecord {
  id: string;
  click_id?: string | null;
  provider_conversion_id?: string | null;
  provider_name?: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
  user_balance?: number;
  offer_name: string;
  type: string;
  status: string;
  points: number;
  payout_usd: number;
  ip_address: string;
  country_code: string;
  device_type?: string;
  created_at: string;
  raw_created_at?: string;
}

interface LeadsManagerProps {
  initialLeads: AdminLeadRecord[];
  totalLeadsCount: number;
  todayLeadsCount: number;
}

interface LeadInspectorDetails {
  conversion: Record<string, unknown>;
  click?: Record<string, unknown> | null;
  user: {
    id: string;
    email: string;
    display_name: string;
    available_points: number;
    lifetime_points: number;
    country_code: string;
    status: string;
  };
}

export default function LeadsManager({
  initialLeads,
  totalLeadsCount,
  todayLeadsCount,
}: LeadsManagerProps) {
  const [leads, setLeads] = useState<AdminLeadRecord[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "approved" | "pending" | "reversed">("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Track / Inspector Modal State
  const [inspectingLead, setInspectingLead] = useState<AdminLeadRecord | null>(null);
  const [inspectorDetails, setInspectorDetails] = useState<LeadInspectorDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Reverse Modal State
  const [reversingLead, setReversingLead] = useState<AdminLeadRecord | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);

  // Action Loading & Toast State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Status Counts
  const counts = useMemo(() => {
    const approved = leads.filter((l) => l.status === "approved").length;
    const pending = leads.filter((l) => l.status === "pending").length;
    const reversed = leads.filter((l) => l.status === "reversed").length;
    return { all: leads.length, approved, pending, reversed };
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
      if (statusFilter !== "All" && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.user_name.toLowerCase().includes(q) ||
          item.user_email.toLowerCase().includes(q) ||
          item.offer_name.toLowerCase().includes(q) ||
          (item.provider_name && item.provider_name.toLowerCase().includes(q)) ||
          item.id.toLowerCase().includes(q) ||
          (item.click_id && item.click_id.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [leads, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const pagedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
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

  // Open Inspector
  const openInspector = async (lead: AdminLeadRecord) => {
    setInspectingLead(lead);
    setInspectorDetails(null);
    setLoadingDetails(true);

    const res = await getLeadDetailsAction(lead.id);
    if (res.success && res.data) {
      setInspectorDetails(res.data as LeadInspectorDetails);
    }
    setLoadingDetails(false);
  };

  // Submit Reversal
  const handleConfirmReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingLead) return;

    setReversing(true);
    const res = await reverseLeadAction({
      conversionId: reversingLead.id,
      reason: reversalReason.trim() || "Manual Admin Reversal",
    });

    if (res.success) {
      setLeads((prev) =>
        prev.map((l) => (l.id === reversingLead.id ? { ...l, status: "reversed" } : l))
      );
      showToast(`Lead ${reversingLead.id.slice(0, 8)} successfully reversed.`);
      if (inspectingLead?.id === reversingLead.id) {
        setInspectingLead({ ...inspectingLead, status: "reversed" });
      }
      setReversingLead(null);
      setReversalReason("");
    } else {
      showToast(res.error || "Failed to reverse lead", "error");
    }

    setReversing(false);
  };

  // Delete Lead
  const handleDeleteLead = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this lead record?")) {
      return;
    }

    setDeletingId(id);
    const res = await deleteLeadAction(id);
    if (res.success) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (inspectingLead?.id === id) {
        setInspectingLead(null);
      }
      showToast("Lead record deleted successfully.");
    } else {
      showToast(res.error || "Failed to delete lead", "error");
    }
    setDeletingId(null);
  };

  // Bulk Delete Leads
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} selected lead record${count > 1 ? "s" : ""}?`)) {
      return;
    }

    setBulkDeleting(true);
    const idsArray = Array.from(selectedIds);
    const res = await bulkDeleteLeadsAction(idsArray);
    if (res.success) {
      setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)));
      if (inspectingLead && selectedIds.has(inspectingLead.id)) {
        setInspectingLead(null);
      }
      setSelectedIds(new Set());
      showToast(`${count} lead record${count > 1 ? "s" : ""} deleted successfully.`);
    } else {
      showToast(res.error || "Failed to bulk delete leads", "error");
    }
    setBulkDeleting(false);
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            backgroundColor: toast.type === "success" ? "#064e3b" : "#7f1d1d",
            border: `1px solid ${toast.type === "success" ? "#059669" : "#dc2626"}`,
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {toast.text}
        </div>
      )}

      <div className="admin-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="admin-page-title">Leads Activity Log</h1>
        {selectedIds.size > 0 && (
          <button
            type="button"
            className="admin-btn-pill"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#f87171",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: bulkDeleting ? "not-allowed" : "pointer",
              opacity: bulkDeleting ? 0.7 : 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            <span>{bulkDeleting ? "Deleting..." : `Bulk Delete (${selectedIds.size})`}</span>
          </button>
        )}
      </div>

      {/* 2 Stat Cards */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Leads</div>
          <div className="admin-stat-val">{totalLeadsCount}</div>
          <div className="admin-stat-sub sub-green">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            </svg>
            <span>Total platform offer leads</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Today Leads</div>
          <div className="admin-stat-val">{todayLeadsCount}</div>
          <div className="admin-stat-sub sub-blue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
            <span>Offer leads completed today</span>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="admin-tabs-bar" style={{ marginBottom: "16px" }}>
        {(["All", "approved", "pending", "reversed"] as const).map((st) => (
          <button
            key={st}
            type="button"
            className={`admin-tab ${statusFilter === st ? "active" : ""}`}
            onClick={() => {
              setStatusFilter(st);
              setCurrentPage(1);
            }}
          >
            {st === "All"
              ? `All (${counts.all})`
              : st === "approved"
              ? `Approved (${counts.approved})`
              : st === "pending"
              ? `Pending (${counts.pending})`
              : `Reversed (${counts.reversed})`}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="admin-table-container">
        {/* Toolbar */}
        <div className="admin-table-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "var(--admin-text-dim)" }}>
              Active filter:
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                padding: "3px 10px",
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: "6px",
                color: "#4ade80",
                textTransform: "capitalize",
              }}
            >
              Status: {statusFilter}
              {statusFilter !== "All" && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("All")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#86efac",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "12px",
                  }}
                >
                  ✕
                </button>
              )}
            </span>

            {selectedIds.size > 0 && (
              <button
                type="button"
                className="admin-action-btn action-red"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: bulkDeleting ? "not-allowed" : "pointer",
                  opacity: bulkDeleting ? 0.7 : 1,
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#f87171",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
                <span>{bulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}</span>
              </button>
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
                placeholder="Search leads, users, offers..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredLeads.length > 0 &&
                      selectedIds.size === filteredLeads.length
                    }
                  />
                </th>
                <th>User</th>
                <th>Offer / Provider</th>
                <th>Type</th>
                <th>Status</th>
                <th>Points</th>
                <th>Payout</th>
                <th>Ip</th>
                <th>Country</th>
                <th>Created at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{
                      textAlign: "center",
                      padding: "48px 16px",
                      color: "var(--admin-text-dim)",
                    }}
                  >
                    No leads recorded yet.
                  </td>
                </tr>
              ) : (
                pagedLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => handleSelectOne(lead.id)}
                      />
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar">
                          {lead.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="admin-user-info">
                          <span className="admin-user-name">{lead.user_name}</span>
                          <span className="admin-user-email">{lead.user_email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: "#f8fafc" }}>{lead.offer_name}</div>
                      {lead.provider_name && (
                        <div style={{ fontSize: "11px", color: "var(--admin-text-dim)" }}>
                          Via {lead.provider_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="admin-type-badge">{lead.type}</span>
                    </td>
                    <td>
                      <span
                        className={`admin-status-pill ${
                          lead.status === "approved"
                            ? "status-active"
                            : lead.status === "pending"
                            ? "status-suspended"
                            : "status-banned"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: "#f8fafc" }}>
                      {lead.points.toLocaleString()} pts
                    </td>
                    <td style={{ color: "#22c55e", fontWeight: 600 }}>
                      ${lead.payout_usd.toFixed(2)}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--admin-text-muted)" }}>
                      {lead.ip_address}
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span>🇧🇩</span>
                        <span style={{ fontSize: "12px", color: "var(--admin-text-muted)" }}>
                          {lead.country_code}
                        </span>
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "12px", color: "var(--admin-text-muted)" }}>
                      {lead.created_at}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button
                          className="admin-action-btn action-green"
                          title="Technical Lead Inspector"
                          onClick={() => openInspector(lead)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
                            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                            <circle cx="12" cy="12" r="2"/>
                            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
                            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
                          </svg>
                          <span>Track</span>
                        </button>

                        {lead.status === "approved" && (
                          <button
                            className="admin-action-btn action-yellow"
                            title="Reverse Lead"
                            onClick={() => {
                              setReversingLead(lead);
                              setReversalReason("");
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1 4 1 10 7 10"/>
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                            </svg>
                            <span>Rev</span>
                          </button>
                        )}

                        <button
                          className="admin-action-btn action-red"
                          title="Delete Lead Record"
                          disabled={deletingId === lead.id}
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                          <span>Del</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLeads.length > 0 && (
          <div className="admin-pagination">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredLeads.length)} of{" "}
              {filteredLeads.length} results
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span>Per page {pageSize}</span>
              <div className="admin-pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`admin-page-num ${page === currentPage ? "active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Technical Audit Inspector Modal ("Track") */}
      {inspectingLead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--admin-card)",
              border: "1px solid var(--admin-border)",
              borderRadius: "14px",
              width: "680px",
              maxWidth: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                  Technical Lead Inspector
                </h2>
                <span style={{ fontSize: "12px", color: "var(--admin-text-dim)" }}>
                  Conversion ID: <code style={{ color: "#38bdf8" }}>{inspectingLead.id}</code>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingLead(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--admin-text-dim)",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--admin-text-dim)" }}>
                Loading full technical audit log...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Summary Stat Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                  <div style={{ backgroundColor: "var(--admin-card-inner)", padding: "12px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--admin-text-dim)", textTransform: "uppercase" }}>Status</div>
                    <div style={{ marginTop: "4px" }}>
                      <span className={`admin-status-pill ${inspectingLead.status === "approved" ? "status-active" : inspectingLead.status === "pending" ? "status-suspended" : "status-banned"}`}>
                        {inspectingLead.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ backgroundColor: "var(--admin-card-inner)", padding: "12px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--admin-text-dim)", textTransform: "uppercase" }}>Reward Points</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", marginTop: "4px" }}>
                      {inspectingLead.points.toLocaleString()} pts
                    </div>
                  </div>

                  <div style={{ backgroundColor: "var(--admin-card-inner)", padding: "12px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--admin-text-dim)", textTransform: "uppercase" }}>USD Payout</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#22c55e", marginTop: "4px" }}>
                      ${inspectingLead.payout_usd.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Offer & Provider Details */}
                <div style={{ backgroundColor: "var(--admin-card-inner)", padding: "16px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: "13px", color: "#94a3b8", textTransform: "uppercase" }}>Offer & Network</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                    <div>Offer Title: <strong>{inspectingLead.offer_name}</strong></div>
                    <div>Category / Type: <strong>{inspectingLead.type}</strong></div>
                    <div>Provider Network: <strong>{inspectingLead.provider_name || "Direct / Custom"}</strong></div>
                    <div>Provider Conversion ID: <code style={{ color: "#38bdf8" }}>{inspectingLead.provider_conversion_id || "N/A"}</code></div>
                  </div>
                </div>

                {/* User Info */}
                <div style={{ backgroundColor: "var(--admin-card-inner)", padding: "16px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: "13px", color: "#94a3b8", textTransform: "uppercase" }}>Member Profile</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                    <div>Name: <strong>{inspectorDetails?.user.display_name || inspectingLead.user_name}</strong></div>
                    <div>Email: <strong>{inspectorDetails?.user.email || inspectingLead.user_email}</strong></div>
                    <div>Available Balance: <strong>{(inspectorDetails?.user.available_points ?? inspectingLead.user_balance ?? 0).toLocaleString()} pts</strong></div>
                    <div>User ID: <code style={{ color: "#94a3b8", fontSize: "11px" }}>{inspectingLead.user_id}</code></div>
                  </div>
                </div>

                {/* Click & Device Attribution */}
                <div style={{ backgroundColor: "var(--admin-card-inner)", padding: "16px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: "13px", color: "#94a3b8", textTransform: "uppercase" }}>Tracking & Attribution</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                    <div>Click ID: <code style={{ color: "#38bdf8" }}>{inspectingLead.click_id || "Direct / None"}</code></div>
                    <div>Device: <strong>{inspectingLead.device_type || "Desktop"}</strong></div>
                    <div>Country: <strong>🇧🇩 {inspectingLead.country_code}</strong></div>
                    <div>Client IP: <code style={{ color: "#94a3b8" }}>{inspectingLead.ip_address}</code></div>
                  </div>
                </div>

                {/* Raw Postback Payload (if available) */}
                {inspectorDetails?.conversion && (
                  <div style={{ backgroundColor: "var(--admin-card-inner)", padding: "16px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "13px", color: "#94a3b8", textTransform: "uppercase" }}>Postback Payload</h4>
                    <pre
                      style={{
                        margin: 0,
                        backgroundColor: "#090d14",
                        padding: "12px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#38bdf8",
                        overflowX: "auto",
                        maxHeight: "140px",
                      }}
                    >
                      {JSON.stringify(inspectorDetails.conversion.postback_payload || {}, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Modal Action Buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                  <div>
                    {inspectingLead.status === "approved" && (
                      <button
                        type="button"
                        className="admin-btn-pill"
                        style={{ backgroundColor: "#eab308", color: "#000000" }}
                        onClick={() => {
                          setReversingLead(inspectingLead);
                          setReversalReason("");
                        }}
                      >
                        Reverse This Lead
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="admin-tab"
                    onClick={() => setInspectingLead(null)}
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reverse Confirmation Modal */}
      {reversingLead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1100,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--admin-card)",
              border: "1px solid var(--admin-border)",
              borderRadius: "14px",
              width: "480px",
              maxWidth: "100%",
              padding: "28px",
            }}
          >
            <h3 style={{ margin: "0 0 8px", color: "#ffffff", fontSize: "18px" }}>
              Reverse Lead Conversion
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--admin-text-muted)" }}>
              Reversing will deduct <strong>{reversingLead.points.toLocaleString()} points</strong> from{" "}
              <strong>{reversingLead.user_name}</strong>, insert a compensating entry in the audit ledger, and notify the member.
            </p>

            <form onSubmit={handleConfirmReverse}>
              <div className="admin-form-group">
                <label className="admin-form-label">Audit Reason</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Chargeback, Proxy detected, Duplicate completion"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="admin-tab"
                  onClick={() => setReversingLead(null)}
                  disabled={reversing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-pill"
                  style={{ backgroundColor: "#eab308", color: "#000000" }}
                  disabled={reversing}
                >
                  {reversing ? "Processing..." : "Confirm Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
