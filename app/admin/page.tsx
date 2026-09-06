import React from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Fetch real database metrics
  const [conversionsRes, usersRes, clicksRes] = await Promise.all([
    supabaseAdmin
      .from("conversions")
      .select("id, payout_usd, created_at, status, user_id"),
    supabaseAdmin
      .from("user_profiles")
      .select("id, created_at"),
    supabaseAdmin
      .from("offer_clicks")
      .select("id, user_id, created_at"),
  ]);

  const conversions = conversionsRes.data ?? [];
  const users = usersRes.data ?? [];
  const clicks = clicksRes.data ?? [];

  // Compute 100% real metrics from database
  const approvedConversions = conversions.filter((c) => c.status === "approved");
  const realTotalRevenue = approvedConversions.reduce(
    (sum, c) => sum + Number(c.payout_usd ?? 0),
    0
  );
  const totalRevenueFormatted = `$${realTotalRevenue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const todayApproved = approvedConversions.filter(
    (c) => new Date(c.created_at) >= startOfToday
  );
  const todayRevenueVal = todayApproved.reduce(
    (sum, c) => sum + Number(c.payout_usd ?? 0),
    0
  );
  const todayRevenue = `$${todayRevenueVal.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const totalLeadsCount = conversions.length;

  // Active users: unique user IDs active via clicks, conversions, or signups
  const getActiveUsersSince = (sinceDate: Date) => {
    const userIds = new Set<string>();
    clicks.forEach((c) => {
      if (c.user_id && new Date(c.created_at) >= sinceDate) {
        userIds.add(c.user_id);
      }
    });
    conversions.forEach((c) => {
      if (c.user_id && new Date(c.created_at) >= sinceDate) {
        userIds.add(c.user_id);
      }
    });
    users.forEach((u) => {
      if (u.id && new Date(u.created_at) >= sinceDate) {
        userIds.add(u.id);
      }
    });
    return userIds.size;
  };

  const activeToday = getActiveUsersSince(startOfToday);
  const activeWeek = getActiveUsersSince(oneWeekAgo);
  const activeMonth = getActiveUsersSince(oneMonthAgo);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const currentYear = now.getFullYear();

  // Monthly Revenue data from real approved conversions for current year
  const revenueData = new Array(12).fill(0);
  approvedConversions.forEach((c) => {
    const d = new Date(c.created_at);
    if (d.getFullYear() === currentYear) {
      revenueData[d.getMonth()] += Number(c.payout_usd ?? 0);
    }
  });

  const maxRevenueVal = Math.max(...revenueData);
  const maxRevenue = maxRevenueVal > 0 ? Math.max(4, Math.ceil(maxRevenueVal * 1.25)) : 100;
  const revenueTicks = Array.from(
    new Set([0, 0.25, 0.5, 0.75, 1].map((pct) => Math.round(maxRevenue * pct)))
  );

  // Monthly Users data from real user registrations for current year
  const usersData = new Array(12).fill(0);
  users.forEach((u) => {
    const d = new Date(u.created_at);
    if (d.getFullYear() === currentYear) {
      usersData[d.getMonth()] += 1;
    }
  });

  const maxUsersVal = Math.max(...usersData);
  const maxUsers = maxUsersVal > 0 ? Math.max(4, Math.ceil(maxUsersVal * 1.25)) : 10;
  const usersTicks = Array.from(
    new Set([0, 0.25, 0.5, 0.75, 1].map((pct) => Math.round(maxUsers * pct)))
  );

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
      </div>

      {/* 6 Metric Cards */}
      <div className="admin-stats-grid">
        {/* Total Revenue */}
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Revenue</div>
          <div className="admin-stat-val">{totalRevenueFormatted}</div>
          <div className="admin-stat-sub sub-green">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
              <path d="M12 18V6"/>
            </svg>
            <span>Total revenue earned</span>
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="admin-stat-card">
          <div className="admin-stat-label">Today's Revenue</div>
          <div className="admin-stat-val">{todayRevenue}</div>
          <div className="admin-stat-sub sub-blue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
            <span>Today's revenue earned</span>
          </div>
        </div>

        {/* Total Leads */}
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Leads</div>
          <div className="admin-stat-val">{totalLeadsCount}</div>
          <div className="admin-stat-sub sub-yellow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            </svg>
            <span>Total number of leads</span>
          </div>
        </div>

        {/* Active Users Today */}
        <div className="admin-stat-card">
          <div className="admin-stat-label">Active Users Today</div>
          <div className="admin-stat-val">{activeToday}</div>
          <div className="admin-stat-sub sub-green">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Active users today</span>
          </div>
        </div>

        {/* Active Users This Week */}
        <div className="admin-stat-card">
          <div className="admin-stat-label">Active Users This Week</div>
          <div className="admin-stat-val">{activeWeek}</div>
          <div className="admin-stat-sub sub-yellow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Active users this week</span>
          </div>
        </div>

        {/* Active Users This Month */}
        <div className="admin-stat-card">
          <div className="admin-stat-label">Active Users This Month</div>
          <div className="admin-stat-val">{activeMonth}</div>
          <div className="admin-stat-sub sub-green">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Active users this month</span>
          </div>
        </div>
      </div>

      {/* Analytics Visual Charts */}
      <div className="admin-charts-grid">
        {/* Revenue Summary Bar Chart */}
        <div className="admin-chart-card">
          <h2 className="admin-chart-title">Revenue Summary</h2>
          <p className="admin-chart-desc">
            This chart shows the revenue earned per month this year.
          </p>

          <div className="admin-chart-body">
            <svg viewBox="0 0 540 220" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              {/* Horizontal Grid lines */}
              {revenueTicks.map((val, idx) => {
                const y = 190 - (val / maxRevenue) * 160;
                return (
                  <g key={`rev-tick-${idx}-${val}`}>
                    <line
                      x1="45"
                      y1={y}
                      x2="520"
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="1"
                    />
                    <text
                      x="35"
                      y={y + 3}
                      fill="#5a6a82"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      ${val.toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* Month Columns / Bars */}
              {months.map((month, idx) => {
                const x = 55 + idx * 38;
                const value = revenueData[idx];
                const barHeight = (value / maxRevenue) * 160;
                const y = 190 - barHeight;

                return (
                  <g key={month}>
                    {value > 0 && (
                      <rect
                        x={x + 4}
                        y={y}
                        width="18"
                        height={barHeight}
                        fill="rgba(34, 197, 94, 0.2)"
                        stroke="#22c55e"
                        strokeWidth="1.5"
                        rx="2"
                      />
                    )}
                    <text
                      x={x + 13}
                      y="208"
                      fill="#8b9bb4"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="admin-chart-legend">
            <span className="legend-square" style={{ backgroundColor: "#22c55e" }} />
            <span>Revenue</span>
          </div>
        </div>

        {/* Users Summary Line Chart */}
        <div className="admin-chart-card">
          <h2 className="admin-chart-title">Users Summary</h2>
          <p className="admin-chart-desc">
            This chart shows the number of users registered per month this year.
          </p>

          <div className="admin-chart-body">
            <svg viewBox="0 0 540 220" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              {/* Horizontal Grid lines */}
              {usersTicks.map((val, idx) => {
                const y = 190 - (val / maxUsers) * 160;
                return (
                  <g key={`user-tick-${idx}-${val}`}>
                    <line
                      x1="45"
                      y1={y}
                      x2="520"
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="1"
                    />
                    <text
                      x="35"
                      y={y + 3}
                      fill="#5a6a82"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {val.toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* Line path calculation */}
              {(() => {
                const points = months.map((_, idx) => {
                  const x = 55 + idx * 38 + 13;
                  const value = usersData[idx];
                  const y = 190 - (value / maxUsers) * 160;
                  return `${x},${y}`;
                });
                const d = `M ${points.join(" L ")}`;

                return (
                  <>
                    <path
                      d={d}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    {months.map((month, idx) => {
                      const x = 55 + idx * 38 + 13;
                      const value = usersData[idx];
                      const y = 190 - (value / maxUsers) * 160;
                      return (
                        <g key={month}>
                          <circle
                            cx={x}
                            cy={y}
                            r={value > 0 ? "4" : "2"}
                            fill="#3b82f6"
                          />
                          <text
                            x={x}
                            y="208"
                            fill="#8b9bb4"
                            fontSize="10"
                            textAnchor="middle"
                          >
                            {month}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="admin-chart-legend">
            <span className="legend-square" style={{ backgroundColor: "#3b82f6" }} />
            <span>Users</span>
          </div>
        </div>
      </div>
    </div>
  );
}
