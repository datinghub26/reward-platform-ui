import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import { getCountryFlag } from "@/lib/geo-utils";
import { getLeaderboardConfig } from "@/lib/leaderboard";

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getInitials(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || "RN";
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const lbConfig = getLeaderboardConfig();

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, display_name, country_code, leaderboard_points, lifetime_points")
    .order("leaderboard_points", { ascending: false })
    .limit(25);

  const currentMonth = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());

  const leaders = (profiles ?? []).map((p, idx) => {
    const rank = idx + 1;
    const prize = lbConfig.prizes.find((pr) => pr.rank === rank);
    return {
      id: p.id,
      rank,
      name: p.display_name?.trim() || "RewardNova Member",
      flag: getCountryFlag(p.country_code || "US"),
      points: Number(p.leaderboard_points ?? p.lifetime_points ?? 0),
      prizePoints: prize ? prize.rewardPoints : 0,
      prizeTitle: prize ? prize.title : null,
      isCurrentUser: user ? user.id === p.id : false,
    };
  });

  const first = leaders[0] || { rank: 1, name: "No Leader Yet", flag: "👑", points: 0, prizePoints: lbConfig.prizes[0]?.rewardPoints || 50000, isCurrentUser: false };
  const second = leaders[1] || { rank: 2, name: "Contender", flag: "🥈", points: 0, prizePoints: lbConfig.prizes[1]?.rewardPoints || 25000, isCurrentUser: false };
  const third = leaders[2] || { rank: 3, name: "Achiever", flag: "🥉", points: 0, prizePoints: lbConfig.prizes[2]?.rewardPoints || 15000, isCurrentUser: false };

  return (
    <div className="dashboard-shell">
      <AppSidebar active="leaderboard" />

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">🏆 Community rankings</span>
            <h1>Leaderboard</h1>
            <p className="muted">
              Live member rankings based on verified offer completions and leaderboard points.
            </p>
          </div>
          <Link className="btn btn-primary" href="/earn">Earn Points →</Link>
        </div>

        {/* Prize Pool Hero Banner */}
        {lbConfig.prizePoolEnabled && (
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
              border: "1px solid rgba(129, 140, 248, 0.3)",
              borderRadius: "14px",
              padding: "20px 24px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "20px" }}>💎</span>
                <strong style={{ fontSize: "16px", color: "#fde047" }}>
                  Active Prize Pool: {formatPoints(lbConfig.totalPrizePoints)} Points (~${(lbConfig.totalPrizePoints / 1000).toFixed(2)})
                </strong>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(34, 197, 94, 0.15)",
                    color: "#86efac",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    textTransform: "uppercase",
                  }}
                >
                  {lbConfig.resetFrequency}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1" }}>
                Top 10 ranking members receive guaranteed bonus payouts credited directly to their balances at reset!
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <Link href="/earn" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>
                Compete & Earn →
              </Link>
            </div>
          </div>
        )}

        <section className="leaderboard-hero">
          <div className="leader-podium second">
            <span className="podium-rank">2</span>
            <div className="podium-avatar">{getInitials(second.name)}</div>
            <strong>{second.name}</strong>
            <span>{formatPoints(second.points)} pts</span>
            {second.prizePoints > 0 && (
              <small style={{ color: "#38bdf8", fontWeight: 700, marginTop: "4px" }}>
                Prize: +{formatPoints(second.prizePoints)} pts
              </small>
            )}
          </div>
          <div className="leader-podium first">
            <span className="crown">👑</span>
            <span className="podium-rank">1</span>
            <div className="podium-avatar">{getInitials(first.name)}</div>
            <strong>{first.name}</strong>
            <span>{formatPoints(first.points)} pts</span>
            {first.prizePoints > 0 && (
              <small style={{ color: "#fde047", fontWeight: 700, marginTop: "4px" }}>
                Prize: +{formatPoints(first.prizePoints)} pts
              </small>
            )}
          </div>
          <div className="leader-podium third">
            <span className="podium-rank">3</span>
            <div className="podium-avatar">{getInitials(third.name)}</div>
            <strong>{third.name}</strong>
            <span>{formatPoints(third.points)} pts</span>
            {third.prizePoints > 0 && (
              <small style={{ color: "#fb923c", fontWeight: 700, marginTop: "4px" }}>
                Prize: +{formatPoints(third.prizePoints)} pts
              </small>
            )}
          </div>
        </section>

        <div className="leaderboard-meta">
          <div>
            <strong>{currentMonth} Leaderboard</strong>
            <span className="muted"> · Real-time rankings</span>
          </div>
          <span className="badge">LIVE</span>
        </div>

        <section className="card leaderboard-table">
          <div className="leader-row leader-head">
            <span>Rank</span><span>Member</span><span>Earned</span>
          </div>
          {leaders.length > 0 ? (
            leaders.map((leader) => (
              <div
                className={`leader-row ${leader.isCurrentUser ? "current-user" : ""}`}
                key={leader.id || `rank-${leader.rank}`}
              >
                <span className="rank-number">
                  #{leader.rank}
                </span>
                <span className="leader-member">
                  <span className="leader-mini-avatar">{getInitials(leader.name)}</span>
                  <span>
                    <strong>{leader.name} {leader.isCurrentUser && <small>(You)</small>}</strong>
                    <small>{leader.flag}</small>
                  </span>
                </span>
                <div style={{ textAlign: "right" }}>
                  <strong className="leader-points" style={{ display: "block" }}>{formatPoints(leader.points)} pts</strong>
                  {leader.prizePoints > 0 && (
                    <span style={{ fontSize: "11px", color: "#86efac", fontWeight: 600 }}>
                      +{formatPoints(leader.prizePoints)} pts prize
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ padding: "32px 16px" }}>
              <p className="muted">No leaderboard rankings recorded yet this period.</p>
            </div>
          )}
        </section>

        <div className="leaderboard-note">
          <strong>How rankings work:</strong> Leaderboard points are automatically credited as you complete verified provider offers. Climb the ranks to unlock bonus multiplier tiers and seasonal reward drops.
        </div>
      </main>
    </div>
  );
}
