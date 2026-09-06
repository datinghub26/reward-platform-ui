import fs from "fs";
import path from "path";

export type PlatformSettings = {
  // Protection
  enableMaxAccounts: boolean;
  maxAccountsPerIp: number;
  enableIpProtection: boolean;
  autoBlockAccount: boolean;
  customDomain: boolean;
  domains: string;
  verifyEmailToWithdraw: boolean;

  // Postback
  enablePendingLeads: boolean;
  pendingPointsThreshold: number;

  // Third Party Integrations
  fraudLabsApiKey: string;
  ipQualityScoreKey: string;
  googleRecaptchaSiteKey: string;
  enableCaptchaOnSignup: boolean;

  // Referral Program
  enableReferrals: boolean;
  referralCommissionRate: number;
  referralSignupBonus: number;

  // Levels Quick Settings
  enableAutoLeveling: boolean;
  levelXpMultiplier: number;

  // Leaderboard Quick Settings
  leaderboardAutoReset: boolean;
  leaderboardResetPeriod: "monthly" | "weekly" | "biweekly";

  // Streaks Quick Settings
  streakAutoAward: boolean;
  streakGracePeriodHours: number;

  // Social Media
  discordUrl: string;
  telegramUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  socialFollowRewardPoints: number;

  // Notification Tone
  notificationToneUrl: string;
  toneFileName: string;

  // Audit
  updatedAt: string;
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  enableMaxAccounts: false,
  maxAccountsPerIp: 1,
  enableIpProtection: false,
  autoBlockAccount: false,
  customDomain: false,
  domains: "gmail.com,yahoo.com,outlook.com",
  verifyEmailToWithdraw: false,

  enablePendingLeads: true,
  pendingPointsThreshold: 4000,

  fraudLabsApiKey: "",
  ipQualityScoreKey: "",
  googleRecaptchaSiteKey: "",
  enableCaptchaOnSignup: false,

  enableReferrals: true,
  referralCommissionRate: 10,
  referralSignupBonus: 100,

  enableAutoLeveling: true,
  levelXpMultiplier: 1.0,

  leaderboardAutoReset: true,
  leaderboardResetPeriod: "monthly",

  streakAutoAward: true,
  streakGracePeriodHours: 24,

  discordUrl: "https://discord.gg/rewardnova",
  telegramUrl: "https://t.me/rewardnova",
  twitterUrl: "https://x.com/rewardnova",
  youtubeUrl: "https://youtube.com/@rewardnova",
  socialFollowRewardPoints: 100,

  notificationToneUrl: "/assets/sounds/notification.mp3",
  toneFileName: "notification.mp3",
  updatedAt: new Date().toISOString(),
};

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

export function getPlatformSettings(): PlatformSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8").replace(/^\uFEFF/, "");
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
    }
  } catch (err) {
    console.error("Failed to read platform settings from disk:", err);
  }
  return { ...DEFAULT_SETTINGS };
}

export function updatePlatformSettings(
  partial: Partial<PlatformSettings>
): PlatformSettings {
  const current = getPlatformSettings();
  const updated: PlatformSettings = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist platform settings to disk:", err);
    throw new Error("Failed to persist platform settings");
  }

  return updated;
}
