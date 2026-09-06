"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
  leadsCount?: number;
  requestsCount?: number;
  ticketsCount?: number;
}

export default function AdminSidebar({
  leadsCount = 0,
  requestsCount = 0,
  ticketsCount = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const [offersOpen, setOffersOpen] = useState(true);
  const [cashoutsOpen, setCashoutsOpen] = useState(true);
  const [rewardsOpen, setRewardsOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-sidebar-brand" style={{ textDecoration: "none" }}>
        <div className="admin-brand-icon">⚡</div>
        <span>RewardNova</span>
      </Link>

      <nav className="admin-sidebar-nav">
        {/* Main Section: Dashboard, Users, Leads, Tickets */}
        <Link
          href="/admin"
          className={`admin-nav-item ${isActive("/admin") ? "active" : ""}`}
        >
          <div className="admin-nav-item-left">
            <span className="admin-nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            <span>Dashboard</span>
          </div>
        </Link>

        <Link
          href="/admin/logs"
          className={`admin-nav-item ${isActive("/admin/logs") ? "active" : ""}`}
        >
          <div className="admin-nav-item-left">
            <span className="admin-nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </span>
            <span>Logs</span>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className={`admin-nav-item ${isActive("/admin/users") ? "active" : ""}`}
        >
          <div className="admin-nav-item-left">
            <span className="admin-nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <span>Users</span>
          </div>
        </Link>

        <Link
          href="/admin/leads"
          className={`admin-nav-item ${isActive("/admin/leads") ? "active" : ""}`}
        >
          <div className="admin-nav-item-left">
            <span className="admin-nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
              </svg>
            </span>
            <span>Leads</span>
          </div>
          {leadsCount > 0 && (
            <span className="admin-nav-badge admin-badge-green">
              {leadsCount}
            </span>
          )}
        </Link>

        <Link
          href="/admin/tickets"
          className={`admin-nav-item ${isActive("/admin/tickets") ? "active" : ""}`}
        >
          <div className="admin-nav-item-left">
            <span className="admin-nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span>Tickets</span>
          </div>
          {ticketsCount > 0 && (
            <span className="admin-nav-badge admin-badge-yellow">
              {ticketsCount}
            </span>
          )}
        </Link>

        {/* Offers Section */}
        <div
          className="admin-nav-section-title"
          onClick={() => setOffersOpen(!offersOpen)}
        >
          <span>Offers</span>
          <span>{offersOpen ? "⌄" : "›"}</span>
        </div>

        {offersOpen && (
          <>
            <Link
              href="/admin/offers-settings"
              className={`admin-nav-item ${isActive("/admin/offers-settings") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </span>
                <span>Config</span>
              </div>
            </Link>

            <Link
              href="/admin/offers"
              className={`admin-nav-item ${isActive("/admin/offers") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </span>
                <span>Offers</span>
              </div>
            </Link>

            <Link
              href="/admin/providers"
              className={`admin-nav-item ${isActive("/admin/providers") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </span>
                <span>Providers</span>
              </div>
            </Link>

            <Link
              href="/admin/pending-offers"
              className={`admin-nav-item ${isActive("/admin/pending-offers") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <span>Pending Offers</span>
              </div>
            </Link>

            <Link
              href="/admin/campaigns"
              className={`admin-nav-item ${isActive("/admin/campaigns") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </span>
                <span>Campaigns</span>
              </div>
            </Link>

            <Link
              href="/admin/campaign-users"
              className={`admin-nav-item ${isActive("/admin/campaign-users") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </span>
                <span>Campaign Users</span>
              </div>
            </Link>

            <Link
              href="/admin/postback"
              className={`admin-nav-item ${isActive("/admin/postback") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                </span>
                <span>Postback</span>
              </div>
            </Link>
          </>
        )}

        {/* Cashouts Section */}
        <div
          className="admin-nav-section-title"
          onClick={() => setCashoutsOpen(!cashoutsOpen)}
        >
          <span>Cashouts</span>
          <span>{cashoutsOpen ? "⌄" : "›"}</span>
        </div>

        {cashoutsOpen && (
          <>
            <Link
              href="/admin/cashouts"
              className={`admin-nav-item ${isActive("/admin/cashouts") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2"/>
                    <line x1="2" x2="22" y1="10" y2="10"/>
                  </svg>
                </span>
                <span>Cashouts</span>
              </div>
            </Link>

            <Link
              href="/admin/withdrawals"
              className={`admin-nav-item ${isActive("/admin/withdrawals") || isActive("/admin/requests") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </span>
                <span>Requests</span>
              </div>
              {requestsCount > 0 && (
                <span className="admin-nav-badge admin-badge-yellow">
                  {requestsCount}
                </span>
              )}
            </Link>
          </>
        )}

        {/* Rewards Section */}
        <div
          className="admin-nav-section-title"
          onClick={() => setRewardsOpen(!rewardsOpen)}
        >
          <span>Rewards</span>
          <span>{rewardsOpen ? "⌄" : "›"}</span>
        </div>

        {rewardsOpen && (
          <>
            <Link
              href="/admin/levels"
              className={`admin-nav-item ${isActive("/admin/levels") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="9" y2="9"/>
                    <line x1="4" x2="20" y1="15" y2="15"/>
                    <line x1="10" x2="8" y1="3" y2="21"/>
                    <line x1="16" x2="14" y1="3" y2="21"/>
                  </svg>
                </span>
                <span>Levels</span>
              </div>
            </Link>

            <Link
              href="/admin/ranks"
              className={`admin-nav-item ${isActive("/admin/ranks") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                    <path d="M4 22h16"/>
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"/>
                    <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34"/>
                    <path d="M14 8h-4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z"/>
                  </svg>
                </span>
                <span>Ranks</span>
              </div>
            </Link>

            <Link
              href="/admin/streaks"
              className={`admin-nav-item ${isActive("/admin/streaks") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                  </svg>
                </span>
                <span>Streaks</span>
              </div>
            </Link>

            <Link
              href="/admin/bonuses"
              className={`admin-nav-item ${isActive("/admin/bonuses") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2"/>
                    <line x1="2" x2="22" y1="10" y2="10"/>
                  </svg>
                </span>
                <span>Bonuses</span>
              </div>
            </Link>
          </>
        )}

        {/* Settings Section */}
        <div
          className="admin-nav-section-title"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <span>Settings</span>
          <span>{settingsOpen ? "⌄" : "›"}</span>
        </div>

        {settingsOpen && (
          <>
            <Link
              href="/admin/navbar-buttons"
              className={`admin-nav-item ${isActive("/admin/navbar-buttons") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="2"/>
                    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
                  </svg>
                </span>
                <span>Navbar Buttons</span>
              </div>
            </Link>

            <Link
              href="/admin/settings"
              className={`admin-nav-item ${isActive("/admin/settings") ? "active" : ""}`}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="21" y2="21"/>
                    <line x1="4" x2="20" y1="14" y2="14"/>
                    <line x1="4" x2="20" y1="7" y2="7"/>
                    <circle cx="8" cy="21" r="2"/>
                    <circle cx="16" cy="14" r="2"/>
                    <circle cx="10" cy="7" r="2"/>
                  </svg>
                </span>
                <span>Settings</span>
              </div>
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
