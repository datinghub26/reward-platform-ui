"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import {
  getPlatformSettingsAsync,
  updatePlatformSettingsAsync,
  updatePlatformSettings,
  DEFAULT_SETTINGS,
  PlatformSettings,
} from "@/lib/settings";
import { logAdminAudit } from "@/lib/audit-logger";

export async function getSettingsAction(): Promise<{
  success: boolean;
  settings: PlatformSettings;
}> {
  try {
    const settings = await getPlatformSettingsAsync();
    return { success: true, settings };
  } catch (err) {
    console.error("getSettingsAction error:", err);
    throw new Error("Failed to load platform settings");
  }
}

export async function saveSettingsAction(
  updates: Partial<PlatformSettings>
): Promise<{
  success: boolean;
  settings: PlatformSettings;
  message: string;
}> {
  try {
    const sanitized: Partial<PlatformSettings> = {};

    // Protection
    if (typeof updates.enableMaxAccounts === "boolean") {
      sanitized.enableMaxAccounts = updates.enableMaxAccounts;
    }
    if (typeof updates.maxAccountsPerIp !== "undefined") {
      sanitized.maxAccountsPerIp = Math.max(1, Math.min(100, Number(updates.maxAccountsPerIp) || 1));
    }
    if (typeof updates.enableIpProtection === "boolean") {
      sanitized.enableIpProtection = updates.enableIpProtection;
    }
    if (typeof updates.autoBlockAccount === "boolean") {
      sanitized.autoBlockAccount = updates.autoBlockAccount;
    }
    if (typeof updates.customDomain === "boolean") {
      sanitized.customDomain = updates.customDomain;
    }
    if (typeof updates.domains === "string") {
      sanitized.domains = updates.domains.trim();
    }
    if (typeof updates.verifyEmailToWithdraw === "boolean") {
      sanitized.verifyEmailToWithdraw = updates.verifyEmailToWithdraw;
    }

    // Postback
    if (typeof updates.enablePendingLeads === "boolean") {
      sanitized.enablePendingLeads = updates.enablePendingLeads;
    }
    if (typeof updates.pendingPointsThreshold !== "undefined") {
      sanitized.pendingPointsThreshold = Math.max(0, Number(updates.pendingPointsThreshold) || 0);
    }

    // Third Party
    if (typeof updates.fraudLabsApiKey === "string") {
      sanitized.fraudLabsApiKey = updates.fraudLabsApiKey.trim();
    }
    if (typeof updates.ipQualityScoreKey === "string") {
      sanitized.ipQualityScoreKey = updates.ipQualityScoreKey.trim();
    }
    if (typeof updates.googleRecaptchaSiteKey === "string") {
      sanitized.googleRecaptchaSiteKey = updates.googleRecaptchaSiteKey.trim();
    }
    if (typeof updates.enableCaptchaOnSignup === "boolean") {
      sanitized.enableCaptchaOnSignup = updates.enableCaptchaOnSignup;
    }

    // Referral
    if (typeof updates.enableReferrals === "boolean") {
      sanitized.enableReferrals = updates.enableReferrals;
    }
    if (typeof updates.referralCommissionRate !== "undefined") {
      sanitized.referralCommissionRate = Math.max(0, Math.min(100, Number(updates.referralCommissionRate) || 0));
    }
    if (typeof updates.referralSignupBonus !== "undefined") {
      sanitized.referralSignupBonus = Math.max(0, Number(updates.referralSignupBonus) || 0);
    }

    // Levels Quick
    if (typeof updates.enableAutoLeveling === "boolean") {
      sanitized.enableAutoLeveling = updates.enableAutoLeveling;
    }
    if (typeof updates.levelXpMultiplier !== "undefined") {
      sanitized.levelXpMultiplier = Math.max(0.1, Number(updates.levelXpMultiplier) || 1.0);
    }

    // Leaderboard Quick
    if (typeof updates.leaderboardAutoReset === "boolean") {
      sanitized.leaderboardAutoReset = updates.leaderboardAutoReset;
    }
    if (updates.leaderboardResetPeriod) {
      sanitized.leaderboardResetPeriod = updates.leaderboardResetPeriod;
    }

    // Streaks Quick
    if (typeof updates.streakAutoAward === "boolean") {
      sanitized.streakAutoAward = updates.streakAutoAward;
    }
    if (typeof updates.streakGracePeriodHours !== "undefined") {
      sanitized.streakGracePeriodHours = Math.max(0, Number(updates.streakGracePeriodHours) || 24);
    }

    // Social Media
    if (typeof updates.discordUrl === "string") sanitized.discordUrl = updates.discordUrl.trim();
    if (typeof updates.telegramUrl === "string") sanitized.telegramUrl = updates.telegramUrl.trim();
    if (typeof updates.twitterUrl === "string") sanitized.twitterUrl = updates.twitterUrl.trim();
    if (typeof updates.youtubeUrl === "string") sanitized.youtubeUrl = updates.youtubeUrl.trim();
    if (typeof updates.socialFollowRewardPoints !== "undefined") {
      sanitized.socialFollowRewardPoints = Math.max(0, Number(updates.socialFollowRewardPoints) || 0);
    }

    // Notification Tone
    if (typeof updates.notificationToneUrl === "string") {
      sanitized.notificationToneUrl = updates.notificationToneUrl;
    }
    if (typeof updates.toneFileName === "string") {
      sanitized.toneFileName = updates.toneFileName;
    }

    const saved = await updatePlatformSettingsAsync(sanitized);

    await logAdminAudit({
      action: "update_settings",
      category: "settings",
      details: "Updated platform settings across configuration tabs.",
    });

    revalidatePath("/admin/settings");
    revalidatePath("/earn");

    return {
      success: true,
      settings: saved,
      message: "Platform settings saved successfully!",
    };
  } catch (err) {
    console.error("saveSettingsAction error:", err);
    const fallbackSettings = await getPlatformSettingsAsync().catch(() => DEFAULT_SETTINGS);
    return {
      success: false,
      settings: fallbackSettings,
      message: err instanceof Error ? err.message : "Failed to save settings",
    };
  }
}

export async function uploadNotificationToneAction(formData: FormData): Promise<{
  success: boolean;
  message: string;
  toneFileName?: string;
  toneUrl?: string;
}> {
  try {
    const file = formData.get("audio") as File | null;
    if (!file || !(file instanceof File)) {
      return { success: false, message: "No audio file was uploaded." };
    }

    // Size limit: 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, message: "Audio file exceeds maximum size of 5MB." };
    }

    const validMimes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
      "audio/ogg",
    ];
    const hasValidExt = /\.(mp3|wav|ogg)$/i.test(file.name);
    if (!validMimes.includes(file.type) && !hasValidExt) {
      return {
        success: false,
        message: "Invalid file type. Please upload an MP3, WAV, or OGG audio file.",
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicSoundsDir = path.join(process.cwd(), "public", "assets", "sounds");

    if (!fs.existsSync(publicSoundsDir)) {
      fs.mkdirSync(publicSoundsDir, { recursive: true });
    }

    const targetPath = path.join(publicSoundsDir, "notification.mp3");
    fs.writeFileSync(targetPath, buffer);

    const targetWavPath = path.join(publicSoundsDir, "notification.wav");
    fs.writeFileSync(targetWavPath, buffer);

    const updated = updatePlatformSettings({
      notificationToneUrl: "/assets/sounds/notification.mp3?v=" + Date.now(),
      toneFileName: file.name,
    });

    await logAdminAudit({
      action: "upload_audio_tone",
      category: "settings",
      details: `Uploaded new notification audio tone: ${file.name}`,
    });

    revalidatePath("/admin/settings");

    return {
      success: true,
      message: "Notification tone uploaded and activated successfully!",
      toneFileName: updated.toneFileName,
      toneUrl: updated.notificationToneUrl,
    };
  } catch (err) {
    console.error("uploadNotificationToneAction error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to upload audio file",
    };
  }
}
