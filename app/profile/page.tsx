import Link from "next/link";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getClientGeo } from "@/lib/geo";
import { calculateUserLevel } from "@/lib/levels";
import { getPlatformSettings } from "@/lib/settings";
import UserLevelWidget from "@/components/UserLevelWidget";
import PromoCodeWidget from "@/components/PromoCodeWidget";
import { getOrAssignUserNumericIdAsync } from "@/lib/user-ids";
import ProfileForm from "./ProfileForm";

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function memberSince(value?: string) {
  if (!value) return "Member";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [geo, { data: profile }, numericId] = await Promise.all([
    getClientGeo(),
    supabase
      .from("user_profiles")
      .select(
        "display_name, country_code, timezone, status, available_points, pending_points, lifetime_points, leaderboard_points, created_at"
      )
      .eq("id", user.id)
      .maybeSingle(),
    getOrAssignUserNumericIdAsync(user.id),
  ]);

  const verifiedCountry = geo.countryCode;

  // Auto-sync verified IP country if missing or changed
  if (profile && profile.country_code !== verifiedCountry) {
    try {
      await supabaseAdmin
        .from("user_profiles")
        .update({ country_code: verifiedCountry })
        .eq("id", user.id);
    } catch (e) {
      console.error("Error auto-syncing profile country from IP:", e);
    }
  }

  const displayName =
    profile?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "RewardNova Member";

  const lifetimePoints = Number(profile?.lifetime_points ?? 0);
  const levelInfo = calculateUserLevel(lifetimePoints);
  const settings = getPlatformSettings();

  return (
    <div className="dashboard-shell">
      <AppSidebar active="profile" />

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">👤 Account</span>
            <h1>Profile</h1>
            <p className="muted">
              Your account information and current RewardNova balance.
            </p>
          </div>
          <Link className="btn" href="/earn">Back to Earn</Link>
        </div>

        {/* Member Level & Progress Widget */}
        <UserLevelWidget levelInfo={levelInfo} lifetimePoints={lifetimePoints} />

        <div className="profile-layout">
          <section className="card profile-card">
            <div className="profile-cover" />
              <div className="profile-header">
                <div className="profile-avatar">#{numericId}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0 }}>{displayName}</h2>
                    <span className="badge" style={{ backgroundColor: "rgba(0, 220, 130, 0.15)", color: "#00dc82", border: "1px solid rgba(0, 220, 130, 0.3)", fontWeight: 700, fontSize: "12px", padding: "4px 8px" }}>
                      User ID: #{numericId}
                    </span>
                  </div>
                  <p className="muted" style={{ margin: "4px 0 0" }}>Member since {memberSince(profile?.created_at)}</p>
                </div>
              </div>

            <div className="profile-stats">
              <div>
                <strong>{formatPoints(lifetimePoints)}</strong>
                <span>Lifetime points</span>
              </div>
              <div>
                <strong>{formatPoints(Number(profile?.leaderboard_points ?? 0))}</strong>
                <span>Leaderboard points</span>
              </div>
              <div>
                <strong>{formatPoints(Number(profile?.available_points ?? 0))}</strong>
                <span>Available points</span>
              </div>
            </div>
          </section>

          {/* Promo Code Voucher Redemption */}
          <PromoCodeWidget />

          <section className="card">
            <div className="card-heading">
              <div>
                <h2>Account information</h2>
                <p>These values come from your authenticated account.</p>
              </div>
              <span className="badge">
                {(profile?.status ?? "active").toUpperCase()}
              </span>
            </div>

            <ProfileForm
              initialDisplayName={displayName}
              email={user.email ?? ""}
              initialCountryCode={verifiedCountry}
              initialTimezone={profile?.timezone ?? null}
              userIdNumber={numericId}
            />
          </section>

          {/* Social Media Communities Section */}
          <section className="card">
            <div className="card-heading">
              <div>
                <h2>Official Communities</h2>
                <p>Join RewardNova channels for bonus promo codes and instant announcements.</p>
              </div>
              <span className="badge" style={{ backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#86efac" }}>
                COMMUNITY
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginTop: "12px" }}>
              {settings.discordUrl && (
                <a
                  href={settings.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 16px",
                    textDecoration: "none",
                    backgroundColor: "rgba(88, 101, 242, 0.12)",
                    border: "1px solid rgba(88, 101, 242, 0.3)",
                    borderRadius: "10px",
                    color: "#a5b4fc",
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>💬</span>
                  <span>Discord</span>
                </a>
              )}

              {settings.telegramUrl && (
                <a
                  href={settings.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 16px",
                    textDecoration: "none",
                    backgroundColor: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    borderRadius: "10px",
                    color: "#7dd3fc",
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>✈️</span>
                  <span>Telegram</span>
                </a>
              )}

              {settings.twitterUrl && (
                <a
                  href={settings.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 16px",
                    textDecoration: "none",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                    color: "#e2e8f0",
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>𝕏</span>
                  <span>Twitter / X</span>
                </a>
              )}

              {settings.youtubeUrl && (
                <a
                  href={settings.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 16px",
                    textDecoration: "none",
                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "10px",
                    color: "#fca5a5",
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>📺</span>
                  <span>YouTube</span>
                </a>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-heading">
              <div>
                <h2>Balance snapshot</h2>
                <p>Current values from your user profile.</p>
              </div>
              <Link className="btn" href="/withdraw" style={{ fontSize: "13px", padding: "6px 14px" }}>
                Withdraw rewards →
              </Link>
            </div>

            <div className="profile-balance-list">
              <div>
                <span>Available</span>
                <strong>{formatPoints(Number(profile?.available_points ?? 0))} pts</strong>
              </div>
              <div>
                <span>Pending</span>
                <strong>{formatPoints(Number(profile?.pending_points ?? 0))} pts</strong>
              </div>
              <div>
                <span>Lifetime</span>
                <strong>{formatPoints(lifetimePoints)} pts</strong>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

