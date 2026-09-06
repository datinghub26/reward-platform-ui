import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

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
  domains: "",
  verifyEmailToWithdraw: true,

  enablePendingLeads: false,
  pendingPointsThreshold: 5000,

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

const CONFIG_KEY = "platform_settings";
const FALLBACK_FILE = "settings.json";

export function getPlatformSettings(): PlatformSettings {
  const parsed = getLocalFallbackConfig<Partial<PlatformSettings>>(FALLBACK_FILE, {});
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
  };
}

export async function getPlatformSettingsAsync(): Promise<PlatformSettings> {
  const fallback = getPlatformSettings();
  const parsed = await getSystemConfig<Partial<PlatformSettings>>(CONFIG_KEY, FALLBACK_FILE, fallback);
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
  };
}

export async function updatePlatformSettingsAsync(
  partial: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  const current = await getPlatformSettingsAsync();
  const updated: PlatformSettings = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, updated);
  return updated;
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

  updatePlatformSettingsAsync(partial).catch((e) => console.error("Async updatePlatformSettings error:", e));
  return updated;
}
