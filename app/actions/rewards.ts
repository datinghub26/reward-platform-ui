"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getStreaksConfigAsync,
  getUserStreakStatusAsync,
  recordUserStreakClaimAsync,
} from "@/lib/streaks";
import { validateAndRedeemPromoCodeAsync } from "@/lib/bonuses";
import { calculateUserLevel } from "@/lib/levels";
import { logAdminAudit } from "@/lib/audit-logger";

export async function getUserRewardsStatusAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { authenticated: false, streak: null, level: null, todayPoints: 0 };
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("available_points, lifetime_points")
      .eq("id", user.id)
      .single();

    const lifetimePoints = Number(profile?.lifetime_points ?? 0);
    const levelInfo = calculateUserLevel(lifetimePoints);
    const streakStatus = await getUserStreakStatusAsync(user.id);

    // Calculate today's approved points for streak qualification
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const { data: conversions } = await supabaseAdmin
      .from("conversions")
      .select("reward_points")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .gte("created_at", startOfToday);

    const todayPoints = (conversions ?? []).reduce(
      (sum, c) => sum + Number(c.reward_points ?? 0),
      0
    );

    const config = await getStreaksConfigAsync();
    const minRequired = config.minDailyPoints || 50;
    const isQualified = todayPoints >= minRequired;

    return {
      authenticated: true,
      userId: user.id,
      streak: {
        ...streakStatus,
        todayPoints,
        minRequiredPoints: minRequired,
        isQualified,
        canClaimNow: streakStatus.canClaimToday && isQualified,
      },
      level: levelInfo,
    };
  } catch (err) {
    console.error("getUserRewardsStatusAction error:", err);
    return { authenticated: false, streak: null, level: null, todayPoints: 0 };
  }
}

export async function claimDailyStreakAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be signed in to claim streak rewards." };
    }

    const streakStatus = await getUserStreakStatusAsync(user.id);
    if (!streakStatus.canClaimToday) {
      return {
        success: false,
        error: streakStatus.alreadyClaimedToday
          ? "You have already claimed your daily streak bonus today! Come back tomorrow."
          : "Daily streaks are currently unavailable.",
      };
    }

    // Check today qualification points
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const { data: conversions } = await supabaseAdmin
      .from("conversions")
      .select("reward_points")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .gte("created_at", startOfToday);

    const todayPoints = (conversions ?? []).reduce(
      (sum, c) => sum + Number(c.reward_points ?? 0),
      0
    );

    const config = await getStreaksConfigAsync();
    const minRequired = config.minDailyPoints || 50;

    if (todayPoints < minRequired) {
      return {
        success: false,
        error: `Earn at least ${minRequired} points today to unlock your streak reward! (Currently earned: ${todayPoints} pts)`,
      };
    }

    // Record streak claim in JSON state
    const recordResult = await recordUserStreakClaimAsync(user.id);
    if (!recordResult.success) {
      return { success: false, error: recordResult.error || "Failed to claim streak." };
    }

    const prizePts = recordResult.rewardPoints;
    const newStreak = recordResult.newStreak;

    // Fetch current balance & apply double-entry ledger credit
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("available_points, lifetime_points")
      .eq("id", user.id)
      .single();

    const currentBal = Number(profile?.available_points ?? 0);
    const currentLifetime = Number(profile?.lifetime_points ?? 0);
    const newBal = currentBal + prizePts;
    const newLifetime = currentLifetime + prizePts;

    // 1. Reward ledger entry
    await supabaseAdmin.from("reward_ledger").insert({
      user_id: user.id,
      entry_type: "credit",
      points: prizePts,
      balance_after: newBal,
      description: `Daily Streak Reward — Day ${newStreak}`,
      created_at: new Date().toISOString(),
    });

    // 2. Balance update
    await supabaseAdmin
      .from("user_profiles")
      .update({
        available_points: newBal,
        lifetime_points: newLifetime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // 3. User notification
    await supabaseAdmin.from("notifications").insert({
      user_id: user.id,
      type: "reward",
      title: `🔥 Day ${newStreak} Streak Claimed!`,
      message: `+${prizePts.toLocaleString()} bonus points credited to your balance! Keep your streak active tomorrow for bigger rewards.`,
      is_read: false,
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return {
      success: true,
      points: prizePts,
      newStreak,
      message: `Day ${newStreak} streak claimed! +${prizePts.toLocaleString()} points added to your balance.`,
    };
  } catch (err) {
    console.error("claimDailyStreakAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to claim daily streak.",
    };
  }
}

export async function redeemPromoCodeAction(rawCode: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be signed in to redeem promo codes." };
    }

    if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
      return { success: false, error: "Please enter a valid promo code." };
    }

    const cleanCode = rawCode.trim().toUpperCase();

    // Check if user already claimed this voucher in reward_ledger
    const { data: existingClaims } = await supabaseAdmin
      .from("reward_ledger")
      .select("id")
      .eq("user_id", user.id)
      .ilike("description", `%Promo Voucher: ${cleanCode}%`)
      .limit(1);

    if (existingClaims && existingClaims.length > 0) {
      return {
        success: false,
        error: "You have already redeemed this promo voucher code!",
      };
    }

    // Validate and update voucher usage (queries Supabase system_config)
    const promoResult = await validateAndRedeemPromoCodeAsync(cleanCode);
    if (!promoResult.success || !promoResult.promo) {
      return { success: false, error: promoResult.error || "Invalid promo code." };
    }

    const prizePts = promoResult.points;

    // Fetch current balance & apply double-entry ledger credit
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("available_points, lifetime_points")
      .eq("id", user.id)
      .single();

    const currentBal = Number(profile?.available_points ?? 0);
    const currentLifetime = Number(profile?.lifetime_points ?? 0);
    const newBal = currentBal + prizePts;
    const newLifetime = currentLifetime + prizePts;

    // 1. Reward ledger entry
    await supabaseAdmin.from("reward_ledger").insert({
      user_id: user.id,
      entry_type: "credit",
      points: prizePts,
      balance_after: newBal,
      description: `Promo Voucher: ${cleanCode}`,
      created_at: new Date().toISOString(),
    });

    // 2. Balance update
    await supabaseAdmin
      .from("user_profiles")
      .update({
        available_points: newBal,
        lifetime_points: newLifetime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // 3. User notification
    await supabaseAdmin.from("notifications").insert({
      user_id: user.id,
      type: "reward",
      title: `🎉 Promo Code ${cleanCode} Redeemed!`,
      message: `+${prizePts.toLocaleString()} bonus points have been added to your balance from voucher ${cleanCode}!`,
      is_read: false,
    });

    // 4. Audit log
    await logAdminAudit({
      action: "redeem_promo_code",
      category: "rewards",
      details: `User ${user.email || user.id} redeemed promo code ${cleanCode} (+${prizePts} pts)`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return {
      success: true,
      points: prizePts,
      code: cleanCode,
      message: `Promo code ${cleanCode} activated! +${prizePts.toLocaleString()} points added to your balance.`,
    };
  } catch (err) {
    console.error("redeemPromoCodeAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to redeem promo code.",
    };
  }
}
