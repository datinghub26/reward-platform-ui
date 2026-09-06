"use client";

import React, { useState } from "react";
import { CampaignParticipant } from "@/lib/campaigns";

interface CampaignUsersListProps {
  initialParticipants: CampaignParticipant[];
}

export default function CampaignUsersList({
  initialParticipants,
}: CampaignUsersListProps) {
  const [participants] = useState<CampaignParticipant[]>(initialParticipants);
  const [search, setSearch] = useState("");

  const filtered = participants.filter((p) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      p.displayName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.campaignTitle.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    );
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
      <div className="admin-page-header">
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
          Campaign-users &gt; List
        </div>
        <h1 className="admin-page-title">Campaign Users</h1>
      </div>

      <div className="admin-table-container">
        {/* Search header matching screenshot */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                fontSize: "14px",
              }}
            >
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search users or campaigns"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-form-input"
              style={{
                paddingLeft: "34px",
                background: "rgba(255, 255, 255, 0.04)",
                fontSize: "13px",
              }}
            />
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "28%" }}>User</th>
              <th style={{ width: "30%" }}>Campaign</th>
              <th style={{ width: "16%" }}>Status</th>
              <th style={{ width: "14%" }}>Reward</th>
              <th style={{ width: "12%" }}>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}
                >
                  No campaign participants found matching "{search}".
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const initial = (item.displayName || item.email || "U")
                  .charAt(0)
                  .toUpperCase();
                const isCompleted = item.status === "completed";

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            background: "rgba(59, 130, 246, 0.2)",
                            color: "#93c5fd",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "14px",
                            flexShrink: 0,
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "14px" }}>
                            {item.displayName}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                            {item.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 500, color: "#e2e8f0", fontSize: "14px" }}>
                        {item.campaignTitle}
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "lowercase",
                          background: isCompleted
                            ? "rgba(34, 197, 94, 0.15)"
                            : "rgba(245, 158, 11, 0.15)",
                          color: isCompleted ? "#86efac" : "#fde68a",
                          border: `1px solid ${
                            isCompleted
                              ? "rgba(34, 197, 94, 0.3)"
                              : "rgba(245, 158, 11, 0.3)"
                          }`,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontWeight: 700, color: "#86efac", fontSize: "14px" }}>
                        {item.rewardPoints.toLocaleString()} pts
                      </span>
                    </td>

                    <td style={{ color: "var(--muted)", fontSize: "13px" }}>
                      {formatDate(item.joinedDate)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            fontSize: "12px",
            color: "var(--muted)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Showing {filtered.length} of {participants.length} results</span>
          <span>Per page 10</span>
        </div>
      </div>
    </div>
  );
}
