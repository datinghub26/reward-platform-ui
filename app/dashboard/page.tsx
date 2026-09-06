import Link from "next/link";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import { calculateUserLevel } from "@/lib/levels";
import { getStreaksConfig, getUserStreakStatus } from "@/lib/streaks";
import UserLevelWidget from "@/components/UserLevelWidget";
import DailyStreakWidget from "@/components/DailyStreakWidget";
import PromoCodeWidget from "@/components/PromoCodeWidget";

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    { data: profile },
    { data: activity },
    { data: pendingConversions },
    { data: todayConversions },
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select(
        "display_name, status, available_points, pending_points, lifetime_points"
      )
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("activity_log")
      .select("id, event_type, title, description, points_delta, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6),

    // Calculate pending rewards directly from conversions.
    supabase
      .from("conversions")
      .select("reward_points")
      .eq("user_id", user.id)
      .eq("status", "pending"),

    // Calculate today's approved points for streak qualification
    supabase
      .from("conversions")
      .select("reward_points")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .gte("created_at", startOfToday),
  ]);

  const displayName =
    profile?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "Member";

  const available = Number(profile?.available_points ?? 0);

  // Pending is calculated from all pending conversions
  const pending = (pendingConversions ?? []).reduce(
    (total, conversion) =>
      total + Number(conversion.reward_points ?? 0),
    0
  );

  const lifetime = Number(profile?.lifetime_points ?? 0);

  // Rewards Engine Calculations
  const levelInfo = calculateUserLevel(lifetime);
  const streakConfig = getStreaksConfig();
  const rawStreakStatus = getUserStreakStatus(user.id);

  const todayPoints = (todayConversions ?? []).reduce(
    (sum, c) => sum + Number(c.reward_points ?? 0),
    0
  );

  const minRequiredPoints = streakConfig.minDailyPoints || 50;
  const isQualified = todayPoints >= minRequiredPoints;

  const streakStatus = {
    ...rawStreakStatus,
    todayPoints,
    minRequiredPoints,
    isQualified,
    canClaimNow: rawStreakStatus.canClaimToday && isQualified,
  };

  return (
    <div className="dashboard-shell">
      <AppSidebar active="dashboard" />

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">✨ Member dashboard</span>
            <h1>Welcome back, {displayName} 👋</h1>
            <div className="muted">
              Your real RewardNova account snapshot and earning activity.
            </div>
          </div>

          <Link className="btn" href="/profile">
            My Profile
          </Link>
        </div>

        {/* 1. Member Level & XP Progress Card */}
        <UserLevelWidget levelInfo={levelInfo} lifetimePoints={lifetime} />

        <section className="stats dashboard-stats">
          <div className="card balance-card">
            <div className="stat-label">Available balance</div>

            <div className="stat-value">
              {formatPoints(available)} pts
            </div>

            <div className="stat-sub">
              ≈ ${(available / 1000).toFixed(2)} available
            </div>

            <div style={{ display: "flex", gap: "14px", marginTop: "4px" }}>
              <Link className="mini-link" href="/earn">
                Earn more →
              </Link>
              {available >= 1000 && (
                <Link className="mini-link" href="/withdraw" style={{ color: "#86efac" }}>
                  Cash out →
                </Link>
              )}
            </div>
          </div>

          <div className="card">
            <div className="stat-label">Pending</div>

            <div className="stat-value">
              {formatPoints(pending)} pts
            </div>

            <div className="stat-sub">
              ≈ ${(pending / 1000).toFixed(2)} awaiting verification
            </div>
          </div>

          <div className="card">
            <div className="stat-label">Lifetime earned</div>

            <div className="stat-value">
              {formatPoints(lifetime)} pts
            </div>

            <div className="stat-sub">
              ≈ ${(lifetime / 1000).toFixed(2)} total
            </div>
          </div>
        </section>

        {/* 2. Daily Streak Ladder Card */}
        <DailyStreakWidget streakStatus={streakStatus} schedule={streakConfig.streakDays} />

        {/* 3. Promo Voucher Redemption Card */}
        <PromoCodeWidget />

        <section className="dashboard-section hero-earn-card card">
          <div>
            <span className="badge">OFFER WALL</span>

            <h2>Find your next earning opportunity</h2>

            <p className="muted">
              All currently available earning activities are organized inside
              one simple Earn marketplace.
            </p>

            <Link className="btn btn-primary" href="/earn">
              Browse Offers →
            </Link>
          </div>

          <div className="hero-earn-visual">
            <div>💰</div>
            <span>Available opportunities</span>
            <strong>Open Earn</strong>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <h2>Quick actions</h2>
              <p>Jump straight to the things you use most.</p>
            </div>
          </div>

          <div className="quick-grid">
            <Link className="card quick" href="/earn">
              <span>💰</span>
              <strong>Browse offers</strong>
              <small>Open the offer wall</small>
            </Link>

            <Link className="card quick" href="/withdraw">
              <span>💸</span>
              <strong>Withdraw</strong>
              <small>Cash out rewards</small>
            </Link>

            <Link className="card quick" href="/referrals">
              <span>👥</span>
              <strong>Referrals</strong>
              <small>Invite & earn 10%</small>
            </Link>

            <Link className="card quick" href="/leaderboard">
              <span>🏆</span>
              <strong>Leaderboard</strong>
              <small>See your ranking</small>
            </Link>

            <Link className="card quick" href="/support">
              <span>🆘</span>
              <strong>Support</strong>
              <small>Get help & answers</small>
            </Link>

            <Link className="card quick" href="/profile">
              <span>⚙️</span>
              <strong>Account</strong>
              <small>Manage your profile</small>
            </Link>
          </div>
        </section>

        <section className="dashboard-section">
  <div className="section-head">
    <div>
      <h2>Recent activity</h2>
      <p>Your latest reward events.</p>
    </div>

    <Link className="text-link" href="/transactions">
      View all transactions →
    </Link>
  </div>

          <div className="card activity">
            {activity && activity.length > 0 ? (
              activity.map((item) => {
                const points = Number(item.points_delta ?? 0);

                return (
                  <div className="activity-row" key={item.id}>
                    <div className="activity-left">
                      <div className="activity-icon">
                        {item.event_type === "conversion"
                          ? "🎁"
                          : "✨"}
                      </div>

                      <div>
                        <strong>{item.title}</strong>

                        <div className="muted">
                          {formatActivityDate(item.created_at)}
                        </div>
                      </div>
                    </div>

                    <div
                      className={
                        points >= 0 ? "positive" : "negative"
                      }
                    >
                      {points >= 0 ? "+" : ""}
                      {formatPoints(points)} pts
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <strong>No activity yet</strong>

                <p>
                  Complete an offer to see your first earning event here.
                </p>

                <Link className="btn btn-primary" href="/earn">
                  Browse Offers
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <h2>Account status</h2>
              <p>Your current account state from RewardNova.</p>
            </div>
          </div>

          <div className="card account-status-card">
            <div>
              <span className="stat-label">Status</span>

              <strong className="status-value">
                {profile?.status === "active"
                  ? "Active"
                  : profile?.status ?? "Active"}
              </strong>
            </div>

            <Link className="text-link" href="/profile">
              View profile →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}