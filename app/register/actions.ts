"use server";

import { recordReferral } from "@/lib/referrals";

export async function registerReferralAction(
  userId: string,
  refCode: string,
  email?: string
) {
  if (!userId || !refCode) {
    return { success: false, error: "Missing required referral parameters" };
  }

  return await recordReferral(userId, refCode, email);
}

export async function validateRegistrationEmailAction(email: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!email || !email.includes("@")) {
    return { valid: false, error: "Please enter a valid email address." };
  }

  try {
    const { getPlatformSettings } = await import("@/lib/settings");
    const settings = getPlatformSettings();

    if (settings.customDomain) {
      const parts = email.toLowerCase().trim().split("@");
      const domain = parts[1];
      const allowedList = (settings.domains || "")
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      if (allowedList.length > 0 && (!domain || !allowedList.includes(domain))) {
        return {
          valid: false,
          error: `Registration is restricted to authorized email domains (${allowedList.join(", ")}).`,
        };
      }
    }

    return { valid: true };
  } catch (err) {
    console.error("Error validating registration email:", err);
    return { valid: true };
  }
}
