import { supabaseAdmin } from "./supabase/admin";
import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

export interface LevelTier {
  level: number;
  title: string;
  requiredPoints: number;
  multiplierBonus: number;
  rewardPoints: number;
  badgeColor?: string;
}

const CONFIG_KEY = "levels_config";
const FALLBACK_FILE = "levels-config.json";

function triggerRevalidation() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/admin/levels");
    revalidatePath("/profile");
    revalidatePath("/dashboard");
  } catch {
    // No-op in non-Next.js runtime
  }
}

export function getLevelTiers(): LevelTier[] {
  const data = getLocalFallbackConfig<{ levels: LevelTier[] }>(FALLBACK_FILE, { levels: [] }, CONFIG_KEY);
  if (Array.isArray(data.levels)) {
    return data.levels.sort((a: LevelTier, b: LevelTier) => a.level - b.level);
  }
  return [];
}

export async function getLevelTiersAsync(): Promise<LevelTier[]> {
  const fallback = getLevelTiers();
  const data = await getSystemConfig<{ levels: LevelTier[] }>(CONFIG_KEY, FALLBACK_FILE, { levels: fallback });
  if (Array.isArray(data.levels)) {
    return data.levels.sort((a: LevelTier, b: LevelTier) => a.level - b.level);
  }
  return [];
}

export async function saveLevelTierAsync(tier: LevelTier): Promise<boolean> {
  try {
    const tiers = await getLevelTiersAsync();
    const index = tiers.findIndex((t) => t.level === tier.level);
    if (index >= 0) {
      tiers[index] = tier;
    } else {
      tiers.push(tier);
    }
    tiers.sort((a, b) => a.level - b.level);

    const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, { levels: tiers });
    triggerRevalidation();
    return ok;
  } catch (err) {
    console.error("Error saving level tier:", err);
    return false;
  }
}

export function saveLevelTier(tier: LevelTier): boolean {
  saveLevelTierAsync(tier).catch((e) => console.error("Async saveLevelTier error:", e));
  return true;
}

export async function deleteLevelTierAsync(levelNumber: number): Promise<boolean> {
  try {
    const tiers = await getLevelTiersAsync();
    const filtered = tiers.filter((t) => t.level !== levelNumber);
    if (filtered.length !== tiers.length) {
      const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, { levels: filtered });
      triggerRevalidation();
      return ok;
    }
    return true;
  } catch (err) {
    console.error("Error deleting level tier:", err);
    return false;
  }
}

export function deleteLevelTier(levelNumber: number): boolean {
  deleteLevelTierAsync(levelNumber).catch((e) => console.error("Async deleteLevelTier error:", e));
  return true;
}

export function calculateUserLevel(lifetimePoints: number): {
  currentTier: LevelTier;
  nextTier: LevelTier | null;
  progressPercent: number;
} {
  const tiers = getLevelTiers();
  if (tiers.length === 0) {
    const defaultTier: LevelTier = {
      level: 1,
      title: "Member",
      requiredPoints: 0,
      multiplierBonus: 0,
      rewardPoints: 0,
    };
    return { currentTier: defaultTier, nextTier: null, progressPercent: 100 };
  }

  let currentTier = tiers[0];
  let nextTier: LevelTier | null = null;

  for (let i = 0; i < tiers.length; i++) {
    if (lifetimePoints >= tiers[i].requiredPoints) {
      currentTier = tiers[i];
      nextTier = tiers[i + 1] || null;
    } else {
      break;
    }
  }

  let progressPercent = 100;
  if (nextTier) {
    const range = nextTier.requiredPoints - currentTier.requiredPoints;
    const gained = lifetimePoints - currentTier.requiredPoints;
    progressPercent = Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
  }

  return { currentTier, nextTier, progressPercent };
}

/**
 * Invoked on approved offer postback to reward user with their level tier multiplier perk.
 */
export async function processLevelMultiplierBonus(
  userId: string,
  basePoints: number
): Promise<{
  awarded: boolean;
  bonusPoints?: number;
  tier?: LevelTier;
  reason?: string;
}> {
  if (!userId || !basePoints || basePoints <= 0) {
    return { awarded: false, reason: "invalid_input" };
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, available_points, lifetime_points")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) {
      return { awarded: false, reason: "user_not_found" };
    }

    const lifetimePoints = Number(profile.lifetime_points) || 0;
    const { currentTier } = calculateUserLevel(lifetimePoints);

    if (!currentTier || currentTier.multiplierBonus <= 0) {
      return { awarded: false, reason: "no_multiplier_perk" };
    }

    // multiplierBonus is a percentage (e.g. 0.5% - 7.5%)
    const bonusPoints = Math.round(basePoints * (currentTier.multiplierBonus / 100));
    if (bonusPoints <= 0) {
      return { awarded: false, reason: "zero_bonus_points" };
    }

    const nextAvail = (Number(profile.available_points) || 0) + bonusPoints;
    const nextLife = lifetimePoints + bonusPoints;

    // 1. Update user profile balance
    const { error: updateErr } = await supabaseAdmin
      .from("user_profiles")
      .update({
        available_points: nextAvail,
        lifetime_points: nextLife,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateErr) {
      console.error("Failed to update user profile for level multiplier bonus:", updateErr);
      return { awarded: false, reason: "profile_update_failed" };
    }

    // 2. Insert immutable double-entry ledger credit
    await supabaseAdmin.from("reward_ledger").insert({
      user_id: userId,
      entry_type: "credit",
      points: bonusPoints,
      balance_after: nextAvail,
      reason: `Level Multiplier Bonus: ${currentTier.title} (+${currentTier.multiplierBonus}%)`,
      metadata: {
        level: currentTier.level,
        level_title: currentTier.title,
        multiplier_percent: currentTier.multiplierBonus,
        base_offer_points: basePoints,
      },
    });

    // 3. Dispatch user notification
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "reward",
      title: "Level Multiplier Bonus! ⚡",
      message: `Your ${currentTier.title} tier boosted your offer reward by +${currentTier.multiplierBonus}% (+${bonusPoints.toLocaleString()} bonus pts)!`,
      is_read: false,
    });

    return {
      awarded: true,
      bonusPoints,
      tier: currentTier,
    };
  } catch (err) {
    console.error("Error processing level multiplier bonus:", err);
    return { awarded: false, reason: "exception" };
  }
}
