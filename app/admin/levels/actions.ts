"use server";

import { LevelTier, saveLevelTier, deleteLevelTier } from "@/lib/levels";
import { logAdminAudit } from "@/lib/audit-logger";

export async function saveLevelTierAction(tier: LevelTier) {
  try {
    if (!tier.title?.trim()) {
      return { success: false, error: "Level title is required." };
    }
    if (tier.level < 1) {
      return { success: false, error: "Level must be 1 or higher." };
    }

    const ok = saveLevelTier({
      ...tier,
      requiredPoints: Number(tier.requiredPoints) || 0,
      multiplierBonus: Number(tier.multiplierBonus) || 0,
      rewardPoints: Number(tier.rewardPoints) || 0,
    });

    if (!ok) {
      return { success: false, error: "Failed to save level tier." };
    }

    await logAdminAudit({
      action: "save_level_tier",
      category: "rewards",
      details: `Saved Level ${tier.level} (${tier.title}): ${tier.requiredPoints} pts threshold, +${tier.multiplierBonus}% bonus`,
    });

    return { success: true, message: `Level ${tier.level} successfully saved.` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save tier." };
  }
}

export async function deleteLevelTierAction(levelNumber: number) {
  try {
    if (levelNumber <= 1) {
      return { success: false, error: "Base Level 1 cannot be deleted." };
    }

    const ok = deleteLevelTier(levelNumber);
    if (!ok) {
      return { success: false, error: "Failed to delete level tier." };
    }

    await logAdminAudit({
      action: "delete_level_tier",
      category: "rewards",
      details: `Deleted Level tier ${levelNumber}`,
    });

    return { success: true, message: `Level ${levelNumber} removed.` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete tier." };
  }
}
