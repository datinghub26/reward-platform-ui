"use client";

import React, { useState, useRef, useTransition } from "react";
import { PlatformSettings } from "@/lib/settings";
import { saveSettingsAction, uploadNotificationToneAction } from "./actions";
import { playRewardSound } from "@/lib/sound";

interface SettingsManagerProps {
  initialSettings?: PlatformSettings;
}

type TabType =
  | "Protection"
  | "Postback"
  | "Third Party"
  | "Referral"
  | "Levels"
  | "Leaderboard"
  | "Streaks"
  | "Social Media"
  | "Notification Tone";

export default function SettingsManager({ initialSettings }: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("Protection");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Protection Tab state
  const [enableMaxAccounts, setEnableMaxAccounts] = useState(
    initialSettings?.enableMaxAccounts ?? false
  );
  const [maxAccountsPerIp, setMaxAccountsPerIp] = useState(
    String(initialSettings?.maxAccountsPerIp ?? 1)
  );
  const [enableIpProtection, setEnableIpProtection] = useState(
    initialSettings?.enableIpProtection ?? false
  );
  const [autoBlockAccount, setAutoBlockAccount] = useState(
    initialSettings?.autoBlockAccount ?? false
  );
  const [customDomain, setCustomDomain] = useState(
    initialSettings?.customDomain ?? false
  );
  const [domains, setDomains] = useState(
    initialSettings?.domains ?? "gmail.com,yahoo.com,outlook.com"
  );
  const [verifyEmailToWithdraw, setVerifyEmailToWithdraw] = useState(
    initialSettings?.verifyEmailToWithdraw ?? false
  );

  // Postback Tab state
  const [enablePendingLeads, setEnablePendingLeads] = useState(
    initialSettings?.enablePendingLeads ?? true
  );
  const [pendingPointsThreshold, setPendingPointsThreshold] = useState(
    initialSettings?.pendingPointsThreshold ?? 4000
  );

  // Third Party Tab state
  const [fraudLabsApiKey, setFraudLabsApiKey] = useState(
    initialSettings?.fraudLabsApiKey ?? ""
  );
  const [ipQualityScoreKey, setIpQualityScoreKey] = useState(
    initialSettings?.ipQualityScoreKey ?? ""
  );
  const [googleRecaptchaSiteKey, setGoogleRecaptchaSiteKey] = useState(
    initialSettings?.googleRecaptchaSiteKey ?? ""
  );
  const [enableCaptchaOnSignup, setEnableCaptchaOnSignup] = useState(
    initialSettings?.enableCaptchaOnSignup ?? false
  );

  // Referral Tab state
  const [enableReferrals, setEnableReferrals] = useState(
    initialSettings?.enableReferrals ?? true
  );
  const [referralCommissionRate, setReferralCommissionRate] = useState(
    String(initialSettings?.referralCommissionRate ?? 10)
  );
  const [referralSignupBonus, setReferralSignupBonus] = useState(
    String(initialSettings?.referralSignupBonus ?? 100)
  );

  // Levels Tab state
  const [enableAutoLeveling, setEnableAutoLeveling] = useState(
    initialSettings?.enableAutoLeveling ?? true
  );
  const [levelXpMultiplier, setLevelXpMultiplier] = useState(
    String(initialSettings?.levelXpMultiplier ?? 1.0)
  );

  // Leaderboard Tab state
  const [leaderboardAutoReset, setLeaderboardAutoReset] = useState(
    initialSettings?.leaderboardAutoReset ?? true
  );
  const [leaderboardResetPeriod, setLeaderboardResetPeriod] = useState<"monthly" | "weekly" | "biweekly">(
    initialSettings?.leaderboardResetPeriod ?? "monthly"
  );

  // Streaks Tab state
  const [streakAutoAward, setStreakAutoAward] = useState(
    initialSettings?.streakAutoAward ?? true
  );
  const [streakGracePeriodHours, setStreakGracePeriodHours] = useState(
    String(initialSettings?.streakGracePeriodHours ?? 24)
  );

  // Social Media Tab state
  const [discordUrl, setDiscordUrl] = useState(
    initialSettings?.discordUrl ?? "https://discord.gg/rewardnova"
  );
  const [telegramUrl, setTelegramUrl] = useState(
    initialSettings?.telegramUrl ?? "https://t.me/rewardnova"
  );
  const [twitterUrl, setTwitterUrl] = useState(
    initialSettings?.twitterUrl ?? "https://x.com/rewardnova"
  );
  const [youtubeUrl, setYoutubeUrl] = useState(
    initialSettings?.youtubeUrl ?? "https://youtube.com/@rewardnova"
  );
  const [socialFollowRewardPoints, setSocialFollowRewardPoints] = useState(
    String(initialSettings?.socialFollowRewardPoints ?? 100)
  );

  // Notification Tone Tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>(
    initialSettings?.toneFileName || "notification.mp3"
  );
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>(
    initialSettings?.notificationToneUrl || "/assets/sounds/notification.mp3"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: TabType[] = [
    "Protection",
    "Postback",
    "Third Party",
    "Referral",
    "Levels",
    "Leaderboard",
    "Streaks",
    "Social Media",
    "Notification Tone",
  ];

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("Audio file exceeds maximum 5MB limit.", "error");
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setAudioPreviewUrl(url);
      setAudioFileName(file.name);
      showToast(`Selected "${file.name}". Click "Save changes" to upload.`, "success");
    }
  };

  const playPreviewTone = () => {
    try {
      if (selectedFile && audioPreviewUrl.startsWith("blob:")) {
        const audio = new Audio(audioPreviewUrl);
        audio.volume = 0.7;
        audio.play().catch((err) => {
          console.warn("Audio preview error, trying default tone:", err);
          playRewardSound();
        });
      } else {
        playRewardSound();
      }
    } catch {
      playRewardSound();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        if (selectedFile) {
          const formData = new FormData();
          formData.append("audio", selectedFile);
          const uploadRes = await uploadNotificationToneAction(formData);
          if (!uploadRes.success) {
            showToast(uploadRes.message, "error");
            return;
          }
          if (uploadRes.toneFileName) {
            setAudioFileName(uploadRes.toneFileName);
          }
          if (uploadRes.toneUrl) {
            setAudioPreviewUrl(uploadRes.toneUrl);
          }
        }

        const updates: Partial<PlatformSettings> = {
          // Protection
          enableMaxAccounts,
          maxAccountsPerIp: parseInt(maxAccountsPerIp, 10) || 1,
          enableIpProtection,
          autoBlockAccount,
          customDomain,
          domains,
          verifyEmailToWithdraw,

          // Postback
          enablePendingLeads,
          pendingPointsThreshold: Number(pendingPointsThreshold) || 4000,

          // Third Party
          fraudLabsApiKey,
          ipQualityScoreKey,
          googleRecaptchaSiteKey,
          enableCaptchaOnSignup,

          // Referral
          enableReferrals,
          referralCommissionRate: parseFloat(referralCommissionRate) || 10,
          referralSignupBonus: parseInt(referralSignupBonus, 10) || 100,

          // Levels Quick
          enableAutoLeveling,
          levelXpMultiplier: parseFloat(levelXpMultiplier) || 1.0,

          // Leaderboard Quick
          leaderboardAutoReset,
          leaderboardResetPeriod,

          // Streaks Quick
          streakAutoAward,
          streakGracePeriodHours: parseInt(streakGracePeriodHours, 10) || 24,

          // Social Media
          discordUrl,
          telegramUrl,
          twitterUrl,
          youtubeUrl,
          socialFollowRewardPoints: parseInt(socialFollowRewardPoints, 10) || 100,
        };

        const res = await saveSettingsAction(updates);
        if (res.success) {
          showToast(res.message, "success");
          setSelectedFile(null);
        } else {
          showToast(res.message, "error");
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to save settings", "error");
      }
    });
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Top Header */}
      <div className="admin-page-header" style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>
          Settings &rsaquo; List
        </div>
        <h1 className="admin-page-title">Settings</h1>
      </div>

      {/* Tabs Row */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "12px",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: isSelected ? "#22c55e" : "transparent",
                color: isSelected ? "#ffffff" : "#94a3b8",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {toast && (
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: toast.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${toast.type === "success" ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
            borderRadius: "8px",
            color: toast.type === "success" ? "#4ade80" : "#f87171",
            fontSize: "13px",
            fontWeight: 500,
            marginBottom: "20px",
          }}
        >
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Protection Tab */}
        {activeTab === "Protection" && (
          <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Accounts
            </h2>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "6px" }}>
                <input
                  type="checkbox"
                  checked={enableMaxAccounts}
                  onChange={(e) => setEnableMaxAccounts(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Enable max accounts per ip</span>
              </label>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "26px", marginBottom: "12px" }}>
                Limit the number of accounts that can be created from the same IP address.
              </div>
              <div style={{ marginLeft: "26px", maxWidth: "340px" }}>
                <label className="admin-form-label">Max accounts per ip</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={maxAccountsPerIp}
                  onChange={(e) => setMaxAccountsPerIp(e.target.value)}
                  min={1}
                  max={50}
                />
              </div>
            </div>

            <hr style={{ borderColor: "rgba(255, 255, 255, 0.08)", margin: "24px 0" }} />

            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Change IP Protection
            </h2>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "6px" }}>
                <input
                  type="checkbox"
                  checked={enableIpProtection}
                  onChange={(e) => setEnableIpProtection(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Enable IP Change Protection</span>
              </label>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "26px", marginBottom: "12px" }}>
                Prevent users from switching between multiple disparate IP regions during active sessions.
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "6px" }}>
                <input
                  type="checkbox"
                  checked={autoBlockAccount}
                  onChange={(e) => setAutoBlockAccount(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Auto Block Account</span>
              </label>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "26px" }}>
                Flag and restrict accounts that trigger high-velocity IP hop violations.
              </div>
            </div>

            <hr style={{ borderColor: "rgba(255, 255, 255, 0.08)", margin: "24px 0" }} />

            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Email & Withdrawal Verification
            </h2>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "6px" }}>
                <input
                  type="checkbox"
                  checked={customDomain}
                  onChange={(e) => setCustomDomain(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Custom Allowed Domains</span>
              </label>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "26px", marginBottom: "12px" }}>
                Allow user registrations only from trusted email providers.
              </div>
              <div style={{ marginLeft: "26px", maxWidth: "480px", marginBottom: "16px" }}>
                <label className="admin-form-label">Domains (comma separated)</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  placeholder="gmail.com,yahoo.com,outlook.com"
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "6px" }}>
                <input
                  type="checkbox"
                  checked={verifyEmailToWithdraw}
                  onChange={(e) => setVerifyEmailToWithdraw(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Verify Email to Withdraw</span>
              </label>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "26px" }}>
                Require members to confirm their email before submitting withdrawal requests.
              </div>
            </div>
          </div>
        )}

        {/* Postback Tab */}
        {activeTab === "Postback" && (
          <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Lead Configuration
            </h2>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "6px" }}>
              <input
                type="checkbox"
                checked={enablePendingLeads}
                onChange={(e) => setEnablePendingLeads(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
              />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Enable Pending Leads</span>
            </label>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "26px", marginBottom: "18px" }}>
              Toggle to place large payout postbacks into a pending verification hold.
            </div>

            <div style={{ marginLeft: "26px", maxWidth: "340px" }}>
              <label className="admin-form-label">Pending Points Threshold</label>
              <input
                type="number"
                className="admin-form-input"
                value={pendingPointsThreshold}
                onChange={(e) => setPendingPointsThreshold(parseInt(e.target.value, 10) || 0)}
              />
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                Leads with points exceeding this value will be held in pending status.
              </div>
            </div>
          </div>
        )}

        {/* Third Party Tab */}
        {activeTab === "Third Party" && (
          <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Anti-Fraud & Security Integrations
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              <div>
                <label className="admin-form-label">FraudLabs Pro API Key</label>
                <input
                  type="password"
                  className="admin-form-input"
                  value={fraudLabsApiKey}
                  onChange={(e) => setFraudLabsApiKey(e.target.value)}
                  placeholder="Enter FraudLabs API key"
                />
              </div>
              <div>
                <label className="admin-form-label">IPQualityScore (IPQS) Key</label>
                <input
                  type="password"
                  className="admin-form-input"
                  value={ipQualityScoreKey}
                  onChange={(e) => setIpQualityScoreKey(e.target.value)}
                  placeholder="Enter IPQS proxy check key"
                />
              </div>
            </div>

            <hr style={{ borderColor: "rgba(255, 255, 255, 0.08)", margin: "24px 0" }} />

            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Bot Protection & Captcha
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label className="admin-form-label">reCAPTCHA / hCaptcha Site Key</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={googleRecaptchaSiteKey}
                  onChange={(e) => setGoogleRecaptchaSiteKey(e.target.value)}
                  placeholder="e.g. 6Ld... or hcaptcha-site-key"
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: "24px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={enableCaptchaOnSignup}
                    onChange={(e) => setEnableCaptchaOnSignup(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
                  />
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Require Captcha on Registration</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Referral Tab */}
        {activeTab === "Referral" && (
          <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Referral Program Configuration
            </h2>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "6px" }}>
              <input
                type="checkbox"
                checked={enableReferrals}
                onChange={(e) => setEnableReferrals(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
              />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Enable Referral Program</span>
            </label>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "26px", marginBottom: "20px" }}>
              Allows active members to invite friends and earn commissions from completed offers.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginLeft: "26px", maxWidth: "600px" }}>
              <div>
                <label className="admin-form-label">Commission Rate (%)</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={referralCommissionRate}
                  onChange={(e) => setReferralCommissionRate(e.target.value)}
                  min={0}
                  max={100}
                />
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                  Percentage of earnings credited to the referrer.
                </div>
              </div>

              <div>
                <label className="admin-form-label">New User Signup Bonus (pts)</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={referralSignupBonus}
                  onChange={(e) => setReferralSignupBonus(e.target.value)}
                  min={0}
                />
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                  Bonus points awarded when joining via referral link.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Levels Tab */}
        {activeTab === "Levels" && (
          <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Member Progression & Level Perks
            </h2>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "6px" }}>
              <input
                type="checkbox"
                checked={enableAutoLeveling}
                onChange={(e) => setEnableAutoLeveling(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
              />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Enable Automatic Level Progression</span>
            </label>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "26px", marginBottom: "18px" }}>
              Automatically upgrade member level tier as their lifetime points accumulate.
            </div>

            <div style={{ marginLeft: "26px", maxWidth: "340px" }}>
              <label className="admin-form-label">Level XP Multiplier Scale</label>
              <input
                type="number"
                step="0.1"
                className="admin-form-input"
                value={levelXpMultiplier}
                onChange={(e) => setLevelXpMultiplier(e.target.value)}
                min={0.1}
                max={5.0}
              />
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                Global multiplier applied to tier progression requirements (default: 1.0).
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "Leaderboard" && (
          <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Community Leaderboard Automation
            </h2>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "6px" }}>
              <input
                type="checkbox"
                checked={leaderboardAutoReset}
                onChange={(e) => setLeaderboardAutoReset(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
              />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Automate Cycle Reset</span>
            </label>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "26px", marginBottom: "18px" }}>
              Automatically archive competition rankings when the cycle ends.
            </div>

            <div style={{ marginLeft: "26px", maxWidth: "340px" }}>
              <label className="admin-form-label">Cadence Period</label>
              <select
                className="admin-form-input"
                value={leaderboardResetPeriod}
                onChange={(e) => setLeaderboardResetPeriod(e.target.value as any)}
              >
                <option value="monthly">Monthly Cycle (1st of each month)</option>
                <option value="weekly">Weekly Cycle (Every Monday)</option>
                <option value="biweekly">Bi-weekly Cycle (1st & 15th)</option>
              </select>
            </div>
          </div>
        )}

        {/* Streaks Tab */}
        {activeTab === "Streaks" && (
          <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Daily Streaks Automation
            </h2>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "6px" }}>
              <input
                type="checkbox"
                checked={streakAutoAward}
                onChange={(e) => setStreakAutoAward(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#22c55e" }}
              />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>Auto-Award Daily Streaks</span>
            </label>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "26px", marginBottom: "18px" }}>
              Instantly credit streak milestone points upon first qualifying activity each calendar day.
            </div>

            <div style={{ marginLeft: "26px", maxWidth: "340px" }}>
              <label className="admin-form-label">Streak Grace Window (Hours)</label>
              <input
                type="number"
                className="admin-form-input"
                value={streakGracePeriodHours}
                onChange={(e) => setStreakGracePeriodHours(e.target.value)}
                min={0}
                max={72}
              />
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                Hours allowed past midnight before a streak resets (default: 24h).
              </div>
            </div>
          </div>
        )}

        {/* Social Media Tab */}
        {activeTab === "Social Media" && (
          <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Official Community Channels
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              <div>
                <label className="admin-form-label">Discord Server Invite</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  placeholder="https://discord.gg/..."
                />
              </div>
              <div>
                <label className="admin-form-label">Telegram Channel / Group</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={telegramUrl}
                  onChange={(e) => setTelegramUrl(e.target.value)}
                  placeholder="https://t.me/..."
                />
              </div>
              <div>
                <label className="admin-form-label">X / Twitter Profile</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://x.com/..."
                />
              </div>
              <div>
                <label className="admin-form-label">YouTube Channel</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@..."
                />
              </div>
            </div>

            <div style={{ maxWidth: "340px" }}>
              <label className="admin-form-label">Social Follow Reward Points</label>
              <input
                type="number"
                className="admin-form-input"
                value={socialFollowRewardPoints}
                onChange={(e) => setSocialFollowRewardPoints(e.target.value)}
                min={0}
              />
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                Bonus points awarded when users link their verified community account.
              </div>
            </div>
          </div>
        )}

        {/* Notification Tone Tab */}
        {activeTab === "Notification Tone" && (
          <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "4px" }}>
              Notification Tone Settings
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--muted)" }}>
              Configure or upload sound alerts for offer completions and user balance updates.
            </p>

            <label className="admin-form-label" style={{ marginBottom: "8px", display: "block" }}>
              Offer Completion Audio File (.mp3, .wav)
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: "12px",
                padding: "48px 24px",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                transition: "all 0.2s ease",
                marginBottom: "16px",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.ogg,audio/*"
                onChange={handleAudioSelect}
                style={{ display: "none" }}
              />
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>🎵</div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#e2e8f0" }}>
                {selectedFile ? (
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>Selected: {selectedFile.name}</span>
                ) : (
                  <>
                    Drag &amp; Drop your files or <span style={{ color: "#22c55e", fontWeight: 600 }}>Browse</span>
                  </>
                )}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                Supported audio formats: MP3, WAV (max 5MB)
              </div>
            </div>

            <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.5, marginBottom: "20px" }}>
              Upload a custom audio notification that will play for users when an offer is completed and points are credited.
              Currently active tone: <code style={{ color: "#93c5fd" }}>{audioFileName}</code>
            </div>

            <button
              type="button"
              className="admin-btn"
              onClick={playPreviewTone}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                padding: "8px 18px",
              }}
            >
              <span>▶</span> Test Audio Tone
            </button>
          </div>
        )}

        {/* Global Save Button */}
        <div>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isPending}
            style={{
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: 600,
              borderRadius: "8px",
            }}
          >
            {isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
