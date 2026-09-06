"use client";

import React, { useState, useMemo } from "react";
import {
  updateUserAction,
  toggleUserBanAction,
  createUserAction,
  getUserDetailsAction,
} from "./actions";

export interface AdminUserRecord {
  id: string;
  display_name: string;
  email: string;
  role: "admin" | "user";
  level: number;
  points: number;
  lifetime_points?: number;
  status: "active" | "suspended" | "banned";
  verified: boolean;
  privacy: boolean;
  country_code: string;
  created_at: string;
}

interface UserManagerProps {
  initialUsers: AdminUserRecord[];
  totalCount: number;
  todayCount: number;
  bannedCount: number;
}

interface UserDetailPayload {
  profile: Record<string, unknown>;
  email: string;
  lastSignInAt?: string;
  conversions: Array<{
    id: string;
    status: string;
    reward_points: number;
    payout_usd: number;
    created_at: string;
  }>;
  withdrawals: Array<{
    id: string;
    status: string;
    amount_usd: number;
    amount_points: number;
    payment_method: string;
    created_at: string;
  }>;
  ledger: Array<{
    id: string;
    entry_type: string;
    points: number;
    balance_after: number;
    description: string;
    created_at: string;
  }>;
  totalApprovedConversions: number;
  totalWithdrawalsCount: number;
}

export default function UserManager({
  initialUsers,
  totalCount,
  todayCount,
  bannedCount,
}: UserManagerProps) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // New User Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [editStatus, setEditStatus] = useState<"active" | "suspended" | "banned">("active");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "deduct">("add");
  const [pointsAdjustment, setPointsAdjustment] = useState<number | "">("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [updating, setUpdating] = useState(false);

  // View User Details Modal State
  const [viewingUser, setViewingUser] = useState<AdminUserRecord | null>(null);
  const [detailsData, setDetailsData] = useState<UserDetailPayload | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.country_code.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredUsers.map((u) => u.id)));
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

  // Open Edit Modal
  const openEditModal = (user: AdminUserRecord) => {
    setEditingUser(user);
    setEditDisplayName(user.display_name);
    setEditRole(user.role);
    setEditStatus(user.status || "active");
    setAdjustmentType("add");
    setPointsAdjustment("");
    setAdjustmentReason("");
  };

  // Open View Modal
  const openViewModal = async (user: AdminUserRecord) => {
    setViewingUser(user);
    setDetailsData(null);
    setLoadingDetails(true);

    const res = await getUserDetailsAction(user.id);
    if (res.success && res.data) {
      setDetailsData(res.data as UserDetailPayload);
    }
    setLoadingDetails(false);
  };

  // Submit Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);

    const deltaNum = typeof pointsAdjustment === "number" ? pointsAdjustment : 0;
    const pointsDelta = adjustmentType === "add" ? deltaNum : -deltaNum;

    const res = await updateUserAction({
      userId: editingUser.id,
      displayName: editDisplayName,
      role: editRole,
      status: editStatus,
      pointsDelta,
      reason: adjustmentReason,
    });

    if (res.success) {
      // Optimistically update local users state
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === editingUser.id) {
            const currentPts = u.points;
            const newPts = Math.max(0, currentPts + pointsDelta);
            return {
              ...u,
              display_name: editDisplayName.trim() || u.display_name,
              role: editRole,
              status: editStatus,
              points: newPts,
            };
          }
          return u;
        })
      );
      showToast(`User ${editDisplayName || editingUser.display_name} updated successfully!`);
      setEditingUser(null);
    } else {
      showToast(res.error || "Failed to update user", "error");
    }

    setUpdating(false);
  };

  // Toggle Ban / Unban
  const handleToggleBan = async (user: AdminUserRecord) => {
    const targetStatus = user.status === "banned" ? "active" : "banned";
    const confirmText =
      targetStatus === "banned"
        ? `Are you sure you want to ban ${user.email}? This will immediately block access and conversions.`
        : `Unban account for ${user.email}?`;

    if (!window.confirm(confirmText)) return;

    const res = await toggleUserBanAction(user.id, targetStatus);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: targetStatus } : u))
      );
      showToast(`User ${user.email} is now ${targetStatus}.`);
      if (viewingUser?.id === user.id) {
        setViewingUser({ ...viewingUser, status: targetStatus });
      }
    } else {
      showToast(res.error || "Action failed", "error");
    }
  };

  // Submit New User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    setCreatingUser(true);

    const res = await createUserAction({
      email: newEmail,
      displayName: newName,
      password: newPassword || "RewardNova2026!",
      role: newRole,
    });

    if (res.success) {
      const created: AdminUserRecord = {
        id: res.userId || `user-${Date.now()}`,
        display_name: newName.trim() || newEmail.split("@")[0],
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        level: newRole === "admin" ? 100 : 1,
        points: 0,
        status: "active",
        verified: true,
        privacy: false,
        country_code: "US",
        created_at: new Date().toISOString(),
      };
      setUsers([created, ...users]);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("user");
      setShowNewModal(false);
      showToast(`User ${created.email} created successfully!`);
    } else {
      showToast(res.error || "Failed to create user", "error");
    }

    setCreatingUser(false);
  };

  return (
    <div>
      {/* Toast alert */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 20px",
            backgroundColor: toast.type === "success" ? "rgba(34, 197, 94, 0.95)" : "rgba(239, 68, 68, 0.95)",
            color: "#ffffff",
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: "13px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toast.text}</span>
        </div>
      )}

      <div className="admin-page-header">
        <h1 className="admin-page-title">Users</h1>
        <button
          className="admin-btn-pill"
          onClick={() => setShowNewModal(true)}
          style={{ cursor: "pointer" }}
        >
          + New User
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Users</div>
          <div className="admin-stat-val">{totalCount.toLocaleString()}</div>
          <div className="admin-stat-sub sub-green">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Total number of users</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Today Users</div>
          <div className="admin-stat-val">{todayCount}</div>
          <div className="admin-stat-sub sub-blue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            <span>Number of users registered today</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Banned Users</div>
          <div className="admin-stat-val">{bannedCount}</div>
          <div className="admin-stat-sub sub-red">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <span>Number of banned users</span>
          </div>
        </div>
      </div>

      {/* Users Table Container */}
      <div className="admin-table-container">
        <div className="admin-table-toolbar" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ fontSize: "13px", color: "var(--admin-text-muted)" }}>
            Showing <strong>{filteredUsers.length}</strong> active members
          </div>

          <div className="admin-search-input-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by name, email, country, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                      filteredUsers.length > 0 &&
                      selectedIds.size === filteredUsers.length
                    }
                  />
                </th>
                <th>User</th>
                <th>Status</th>
                <th>Role</th>
                <th>Points ⌄</th>
                <th>Privacy</th>
                <th>Country</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.slice(0, 15).map((user) => (
                <tr key={user.id} style={{ opacity: user.status === "banned" ? 0.65 : 1 }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => handleSelectOne(user.id)}
                    />
                  </td>
                  <td>
                    <div className="admin-user-cell">
                      <div
                        className="admin-user-avatar"
                        style={{
                          backgroundColor:
                            user.role === "admin"
                              ? "rgba(239, 68, 68, 0.2)"
                              : user.status === "banned"
                              ? "rgba(100, 116, 139, 0.2)"
                              : "rgba(34, 197, 94, 0.2)",
                          color:
                            user.role === "admin"
                              ? "#ef4444"
                              : user.status === "banned"
                              ? "#94a3b8"
                              : "#22c55e",
                        }}
                      >
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="admin-user-meta">
                        <div className="admin-user-name" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{user.display_name}</span>
                          {user.role === "admin" && (
                            <span style={{ fontSize: "10px", color: "#f87171", fontWeight: 700 }}>★</span>
                          )}
                        </div>
                        <div className="admin-user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {user.status === "banned" ? (
                      <span className="admin-pill" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                        Banned
                      </span>
                    ) : user.status === "suspended" ? (
                      <span className="admin-pill" style={{ backgroundColor: "rgba(234, 179, 8, 0.15)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
                        Suspended
                      </span>
                    ) : (
                      <span className="admin-pill" style={{ backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
                        Active
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`admin-pill ${user.role === "admin" ? "pill-role-admin" : "pill-role-user"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: "#ffffff" }}>
                    {user.points.toLocaleString()}
                  </td>
                  <td>
                    {user.privacy ? (
                      <span style={{ color: "var(--admin-green)", fontSize: "14px" }}>✓</span>
                    ) : (
                      <span style={{ color: "var(--admin-red)", fontSize: "14px", opacity: 0.7 }}>⊘</span>
                    )}
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span>{user.country_code === "BD" ? "🇧🇩" : "🇺🇸"}</span>
                      <span style={{ fontSize: "12px", color: "var(--admin-text-muted)" }}>
                        {user.country_code}
                      </span>
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        className="admin-action-btn action-blue"
                        title="View Details & Wallet History"
                        onClick={() => openViewModal(user)}
                        style={{ cursor: "pointer" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        className="admin-action-btn action-green"
                        title="Edit User & Adjust Points"
                        onClick={() => openEditModal(user)}
                        style={{ cursor: "pointer" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        </svg>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleBan(user)}
                        title={user.status === "banned" ? "Unban Account" : "Ban Account for Fraud"}
                        style={{
                          background: user.status === "banned" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          border: `1px solid ${user.status === "banned" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                          color: user.status === "banned" ? "#4ade80" : "#f87171",
                          borderRadius: "6px",
                          padding: "5px 9px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>{user.status === "banned" ? "Unban" : "Ban"}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="admin-pagination">
          <div>
            Showing 1 to {Math.min(15, filteredUsers.length)} of {totalCount.toLocaleString()} results
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span>Per page 15 ⌄</span>
            <div className="admin-pagination-pages">
              <span className="admin-page-num active">1</span>
              <span className="admin-page-num">2</span>
              <span className="admin-page-num">3</span>
              <span>...</span>
              <span className="admin-page-num">›</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          EDIT USER MODAL (Points Adjustment + Role + Status)
      ======================================================== */}
      {editingUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(4, 8, 16, 0.85)",
            backdropFilter: "blur(6px)",
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
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#ffffff", fontSize: "18px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                <span>✏️</span> Edit User: {editingUser.display_name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Display Name</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Email (Read Only)</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingUser.email}
                    disabled
                    style={{ opacity: 0.6, cursor: "not-allowed" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Role</label>
                  <select
                    className="admin-form-input"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as "admin" | "user")}
                  >
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Account Status</label>
                  <select
                    className="admin-form-input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "active" | "suspended" | "banned")}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned (Blocked)</option>
                  </select>
                </div>
              </div>

              {/* Points Adjustment Box */}
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <strong style={{ fontSize: "13px", color: "#ffffff" }}>🪙 Balance Adjustment</strong>
                  <span style={{ fontSize: "12px", color: "#facc15", fontWeight: 700 }}>
                    Current: {editingUser.points.toLocaleString()} pts (${(editingUser.points / 1000).toFixed(2)})
                  </span>
                </div>

                {/* Add / Deduct Pill Buttons */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType("add")}
                    style={{
                      flex: 1,
                      padding: "7px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: adjustmentType === "add" ? "rgba(34, 197, 94, 0.6)" : "rgba(255, 255, 255, 0.08)",
                      backgroundColor: adjustmentType === "add" ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      color: adjustmentType === "add" ? "#4ade80" : "var(--admin-text-muted)",
                    }}
                  >
                    + Add Points
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentType("deduct")}
                    style={{
                      flex: 1,
                      padding: "7px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: adjustmentType === "deduct" ? "rgba(239, 68, 68, 0.6)" : "rgba(255, 255, 255, 0.08)",
                      backgroundColor: adjustmentType === "deduct" ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      color: adjustmentType === "deduct" ? "#f87171" : "var(--admin-text-muted)",
                    }}
                  >
                    − Deduct Points
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
                  <div>
                    <label className="admin-form-label" style={{ fontSize: "11px" }}>Amount (Points)</label>
                    <input
                      type="number"
                      min="0"
                      className="admin-form-input"
                      placeholder="0"
                      value={pointsAdjustment}
                      onChange={(e) => setPointsAdjustment(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="admin-form-label" style={{ fontSize: "11px" }}>Audit Reason / Note</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="e.g. Compensation bonus"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                    />
                  </div>
                </div>

                {typeof pointsAdjustment === "number" && pointsAdjustment > 0 && (
                  <div style={{ fontSize: "11px", color: "var(--admin-text-muted)", marginTop: "6px" }}>
                    Resulting Balance:{" "}
                    <strong style={{ color: "#ffffff" }}>
                      {Math.max(
                        0,
                        editingUser.points + (adjustmentType === "add" ? pointsAdjustment : -pointsAdjustment)
                      ).toLocaleString()}{" "}
                      points
                    </strong>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="admin-tab"
                  onClick={() => setEditingUser(null)}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-pill"
                  disabled={updating}
                  style={{ cursor: updating ? "not-allowed" : "pointer" }}
                >
                  {updating ? "Saving Changes…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW USER DETAILS MODAL (Inspector)
      ======================================================== */}
      {viewingUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(4, 8, 16, 0.85)",
            backdropFilter: "blur(6px)",
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
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(34, 197, 94, 0.15)",
                    color: "#4ade80",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "20px",
                    fontWeight: 700,
                  }}
                >
                  {viewingUser.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#ffffff", fontSize: "18px", fontWeight: 700 }}>
                    {viewingUser.display_name}
                  </h3>
                  <div style={{ fontSize: "12px", color: "var(--admin-text-muted)" }}>
                    {viewingUser.email} · ID: {viewingUser.id.slice(0, 12)}…
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingUser(null)}
                style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--admin-text-muted)" }}>
                Loading user data & wallet ledger…
              </div>
            ) : (
              <div>
                {/* 4 Overview Metric Boxes */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>Balance</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#facc15" }}>
                      {viewingUser.points.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>Status</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: viewingUser.status === "banned" ? "#f87171" : "#4ade80" }}>
                      {viewingUser.status?.toUpperCase() || "ACTIVE"}
                    </div>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>Conversions</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff" }}>
                      {detailsData?.totalApprovedConversions ?? 0}
                    </div>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>Withdrawals</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff" }}>
                      {detailsData?.totalWithdrawalsCount ?? 0}
                    </div>
                  </div>
                </div>

                {/* Recent Ledger Adjustments */}
                <div style={{ marginBottom: "18px" }}>
                  <h4 style={{ fontSize: "13px", color: "#ffffff", margin: "0 0 8px" }}>
                    📜 Recent Ledger Entries
                  </h4>
                  {detailsData?.ledger && detailsData.ledger.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {detailsData.ledger.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "12px",
                          }}
                        >
                          <div>
                            <span style={{ color: item.entry_type === "credit" ? "#4ade80" : "#f87171", fontWeight: 700, marginRight: "8px" }}>
                              {item.entry_type === "credit" ? "+" : "-"}{item.points.toLocaleString()} pts
                            </span>
                            <span style={{ color: "var(--admin-text-muted)" }}>{item.description}</span>
                          </div>
                          <div style={{ color: "var(--admin-text-dim)", fontSize: "11px" }}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "var(--admin-text-muted)", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                      No ledger adjustments recorded yet.
                    </div>
                  )}
                </div>

                {/* Recent Withdrawals */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "13px", color: "#ffffff", margin: "0 0 8px" }}>
                    💸 Recent Payout Requests
                  </h4>
                  {detailsData?.withdrawals && detailsData.withdrawals.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {detailsData.withdrawals.map((w) => (
                        <div
                          key={w.id}
                          style={{
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "12px",
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: "#ffffff", marginRight: "8px" }}>
                              ${Number(w.amount_usd).toFixed(2)} via {w.payment_method?.toUpperCase()}
                            </span>
                            <span style={{ color: w.status === "paid" ? "#4ade80" : w.status === "rejected" ? "#f87171" : "#facc15" }}>
                              ({w.status})
                            </span>
                          </div>
                          <div style={{ color: "var(--admin-text-dim)", fontSize: "11px" }}>
                            {new Date(w.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "var(--admin-text-muted)", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                      No withdrawal requests from this user.
                    </div>
                  )}
                </div>

                {/* Modal Action Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const u = viewingUser;
                      setViewingUser(null);
                      openEditModal(u);
                    }}
                    className="admin-btn-pill"
                    style={{ backgroundColor: "rgba(34, 197, 94, 0.2)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.4)", cursor: "pointer" }}
                  >
                    Edit User & Points
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleBan(viewingUser)}
                    className="admin-btn-pill"
                    style={{
                      backgroundColor: viewingUser.status === "banned" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: viewingUser.status === "banned" ? "#4ade80" : "#f87171",
                      border: `1px solid ${viewingUser.status === "banned" ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                      cursor: "pointer",
                    }}
                  >
                    {viewingUser.status === "banned" ? "Unban Account" : "Ban Account"}
                  </button>

                  <button
                    type="button"
                    className="admin-tab"
                    onClick={() => setViewingUser(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          NEW USER MODAL
      ======================================================== */}
      {showNewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(4, 8, 16, 0.85)",
            backdropFilter: "blur(6px)",
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
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#ffffff", fontSize: "18px", fontWeight: 700 }}>
                Add New Member
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="admin-form-group">
                <label className="admin-form-label">Email Address *</label>
                <input
                  type="email"
                  className="admin-form-input"
                  placeholder="e.g. member@example.com"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Display Name</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Initial Password (Optional)</label>
                <input
                  type="password"
                  className="admin-form-input"
                  placeholder="Default: RewardNova2026!"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Role</label>
                <select
                  className="admin-form-input"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
                >
                  <option value="user">User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="admin-tab"
                  onClick={() => setShowNewModal(false)}
                  disabled={creatingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-pill"
                  disabled={creatingUser}
                  style={{ cursor: creatingUser ? "not-allowed" : "pointer" }}
                >
                  {creatingUser ? "Creating Account…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

