"use server";

import { revalidatePath } from "next/cache";
import { StreaksConfig, saveStreaksConfig } from "@/lib/streaks";
import { logAdminAudit } from "@/lib/audit-logger";

export async function saveStreaksConfigAction(config: StreaksConfig) {
  try {
    const ok = saveStreaksConfig({
      ...config,
      minDailyPoints: Number(config.minDailyPoints) || 50,
      maxStreakFreeze: Number(config.maxStreakFreeze) || 0,
      streakDays: config.streakDays.map((d) => ({
        ...d,
        bonusPoints: Number(d.bonusPoints) || 0,
      })),
    });

    if (!ok) {
      return { success: false, error: "Failed to save streaks configuration." };
    }

    await logAdminAudit({
      action: "update_streaks_config",
      category: "rewards",
      details: `Updated daily streaks rules: minDailyPoints=${config.minDailyPoints}, 7-day total=${config.streakDays.reduce((s, d) => s + Number(d.bonusPoints), 0)} pts`,
    });

    revalidatePath("/admin/streaks");
    revalidatePath("/dashboard");

    return { success: true, message: "Streak rules updated successfully." };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update streaks." };
  }
}
