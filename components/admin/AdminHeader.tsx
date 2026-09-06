"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminHeaderProps {
  userEmail: string;
}

export default function AdminHeader({ userEmail }: AdminHeaderProps) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Generate breadcrumb text from path
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length <= 1) return null;

    const section = parts[1];
    let formattedSection = section.charAt(0).toUpperCase() + section.slice(1);
    if (section === "offers-settings") formattedSection = "Config";
    if (section === "pending-offers") formattedSection = "Pending Offer Rules";
    if (section === "withdrawals") formattedSection = "Requests";

    return (
      <div className="admin-breadcrumbs">
        <span>{formattedSection}</span>
        <span>›</span>
        <span className="active">List</span>
      </div>
    );
  };

  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "A";

  return (
    <header className="admin-top-header">
      <div>{getBreadcrumbs()}</div>

      <div className="admin-header-actions">
        <Link
          href="/dashboard"
          style={{
            fontSize: "12px",
            color: "var(--admin-text-muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "5px 12px",
            borderRadius: "6px",
            border: "1px solid var(--admin-border-subtle)",
          }}
        >
          ← Member View
        </Link>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="admin-avatar-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title={userEmail}
          >
            {initial}
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "42px",
                width: "220px",
                backgroundColor: "var(--admin-card)",
                border: "1px solid var(--admin-border)",
                borderRadius: "10px",
                padding: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                zIndex: 50,
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--admin-text-dim)" }}>
                Signed in as
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#ffffff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: "10px",
                }}
              >
                {userEmail}
              </div>

              <div style={{ height: "1px", background: "var(--admin-border)", margin: "8px 0" }} />

              <Link
                href="/dashboard"
                style={{
                  display: "block",
                  padding: "6px 8px",
                  fontSize: "12px",
                  color: "var(--admin-text-muted)",
                  borderRadius: "6px",
                }}
                onClick={() => setDropdownOpen(false)}
              >
                Member Dashboard
              </Link>
              <Link
                href="/earn"
                style={{
                  display: "block",
                  padding: "6px 8px",
                  fontSize: "12px",
                  color: "var(--admin-text-muted)",
                  borderRadius: "6px",
                }}
                onClick={() => setDropdownOpen(false)}
              >
                Live Marketplace
              </Link>
              <form action="/auth/signout" method="post" style={{ marginTop: "4px" }}>
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 8px",
                    fontSize: "12px",
                    color: "var(--admin-red)",
                    background: "none",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Sign Out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
