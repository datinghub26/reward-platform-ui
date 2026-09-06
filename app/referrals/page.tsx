import Link from "next/link";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import { getReferralStats } from "@/lib/referrals";
import { getPlatformSettings } from "@/lib/settings";
import ReferralCard from "./ReferralCard";

export const dynamic = "force-dynamic";

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(isoString: string) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export default async function ReferralsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const settings = getPlatformSettings();
  const stats = getReferralStats(user.id);

  // Create a clean referral code from the user's ID
  const referralCode = user.id.slice(0, 8);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const referralUrl = `${siteUrl}/register?ref=${referralCode}`;

  return (
    <div className="dashboard-shell">
      <AppSidebar active="referrals" />

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">👥 Affiliate & Referrals</span>
            <h1>Invite & Earn</h1>
            <p className="muted">
              Invite friends to RewardNova and earn a {stats.commissionRate}% lifetime commission on every offer they complete.
              {settings.referralSignupBonus > 0 && ` Plus, your friends receive +${settings.referralSignupBonus} bonus points upon registration!`}
            </p>
          </div>
          <Link className="btn btn-primary" href="/earn">Earn Points →</Link>
        </div>

        {!settings.enableReferrals && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "10px",
              padding: "14px 18px",
              marginBottom: 20,
              color: "#fde68a",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px",
            }}
          >
            <span>⚠️</span>
            <span>
              <strong>Referral Program Paused:</strong> New commission earnings are temporarily paused by administration. Your referral link is preserved.
            </span>
          </div>
        )}

        <section className="stats dashboard-stats">
          <div className="card">
            <div className="stat-label">Total referred</div>
            <div className="stat-value">{stats.totalReferred}</div>
            <div className="stat-sub">Registered friends</div>
          </div>

          <div className="card">
            <div className="stat-label">Commission rate</div>
            <div className="stat-value positive">{stats.commissionRate}%</div>
            <div className="stat-sub">Lifetime on all offers</div>
          </div>

          <div className="card">
            <div className="stat-label">Referral earnings</div>
            <div className="stat-value positive">+{formatPoints(stats.totalCommissionPoints)} pts</div>
            <div className="stat-sub">≈ ${stats.totalCommissionUsd.toFixed(2)} earned</div>
          </div>
        </section>

        <ReferralCard
          referralCode={referralCode}
          referralUrl={referralUrl}
          commissionRate={stats.commissionRate}
          signupBonus={settings.referralSignupBonus}
        />

        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <h2>Referred Friends ({stats.invitees.length})</h2>
              <p>Track friends registered through your invitation link.</p>
            </div>
          </div>

          {stats.invitees.length === 0 ? (
            <div className="card" style={{ padding: "36px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: 12 }}>👥</div>
              <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>No referred friends yet</h3>
              <p className="muted" style={{ margin: "0 auto 18px", maxWidth: "440px", fontSize: "14px" }}>
                Share your personal link above to start earning passive {stats.commissionRate}% commissions when friends complete offers.
              </p>
            </div>
          ) : (
            <div className="card" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "var(--muted)" }}>
                    <th style={{ padding: "12px 16px" }}>Friend</th>
                    <th style={{ padding: "12px 16px" }}>Joined</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Commissions Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.invitees.map((inv) => (
                    <tr
                      key={inv.id}
                      style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 500 }}>
                        <span style={{ marginRight: "8px" }}>👤</span>
                        {inv.email}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: "13px" }}>
                        {formatDate(inv.joinedAt)}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            background: "rgba(34, 197, 94, 0.15)",
                            color: "#86efac",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            borderRadius: "4px",
                            padding: "3px 8px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          Active
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 600, color: "#86efac" }}>
                        +{formatPoints(inv.commissionEarned)} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <h2>How referrals work</h2>
              <p>Three easy steps to start earning passive rewards.</p>
            </div>
          </div>

          <div className="quick-grid">
            <div className="card quick">
              <span style={{ fontSize: "28px" }}>🔗</span>
              <strong>1. Share your link</strong>
              <small>
                Send your unique referral link to friends, family, or social media followers.
              </small>
            </div>

            <div className="card quick">
              <span style={{ fontSize: "28px" }}>🎯</span>
              <strong>2. Friends complete offers</strong>
              <small>
                When they sign up and start completing surveys, games, and tasks on the offer wall.
              </small>
            </div>

            <div className="card quick">
              <span style={{ fontSize: "28px" }}>💸</span>
              <strong>3. Earn {stats.commissionRate}% commission</strong>
              <small>
                Receive an automatic {stats.commissionRate}% points bonus credited directly to your balance every time they earn.
              </small>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="card">
            <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>Referral Program Rules</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: "var(--muted)", fontSize: "14px", lineHeight: "1.7" }}>
              <li>Referral bonuses are credited automatically when provider postbacks are verified and approved.</li>
              <li>Self-referrals or creating multiple accounts to earn commissions is strictly prohibited and results in permanent account restriction.</li>
              <li>There is no limit to the number of friends you can refer or the total bonus points you can earn.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

