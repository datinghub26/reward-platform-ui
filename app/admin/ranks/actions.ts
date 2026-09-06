"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LeaderboardConfig, saveLeaderboardConfig, getLeaderboardConfig } from "@/lib/leaderboard";
import { logAdminAudit } from "@/lib/audit-logger";

export async function saveLeaderboardConfigAction(config: LeaderboardConfig) {
  try {
    const ok = saveLeaderboardConfig(config);
    if (!ok) {
      return { success: false, error: "Failed to save leaderboard settings." };
    }

    await logAdminAudit({
      action: "update_leaderboard_config",
      category: "rewards",
      details: `Updated leaderboard prizes (${config.prizes.length} tiers, total: ${config.totalPrizePoints} pts)`,
    });

    revalidatePath("/admin/ranks");
    revalidatePath("/leaderboard");

    return { success: true, message: "Leaderboard prize settings updated." };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update." };
  }
}

export async function distributeLeaderboardRewardsAction(resetPoints: boolean = true) {
  try {
    const config = getLeaderboardConfig();
    if (!config.prizePoolEnabled) {
      return { success: false, error: "Leaderboard prize pool is currently disabled." };
    }

    // 1. Fetch top users ordered by leaderboard_points
    const { data: topProfiles, error: fetchErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id, display_name, available_points, leaderboard_points")
      .order("leaderboard_points", { ascending: false })
      .limit(config.prizes.length);

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }

    if (!topProfiles || topProfiles.length === 0) {
      return { success: false, error: "No active contestants found on the leaderboard." };
    }

    let distributedCount = 0;
    let totalAwarded = 0;

    for (let i = 0; i < topProfiles.length; i++) {
      const profile = topProfiles[i];
      const rank = i + 1;
      const userLdrPts = Number(profile.leaderboard_points ?? 0);

      // Only reward users who earned leaderboard points
      if (userLdrPts <= 0) continue;

      const prize = config.prizes.find((p) => p.rank === rank);
      if (!prize || prize.rewardPoints <= 0) continue;

      const prizePts = prize.rewardPoints;
      const currentBal = Number(profile.available_points ?? 0);
      const newBal = currentBal + prizePts;

      // Double-entry ledger
      await supabaseAdmin.from("reward_ledger").insert({
        user_id: profile.id,
        points: prizePts,
        balance_after: newBal,
        entry_type: "credit",
        description: `Leaderboard Prize — Rank #${rank} (${prize.title})`,
      });

      // Update user profile balance
      await supabaseAdmin
        .from("user_profiles")
        .update({
          available_points: newBal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      // Notify winner
      await supabaseAdmin.from("notifications").insert({
        user_id: profile.id,
        type: "reward",
        title: `🏆 You Finished #${rank} on the Leaderboard!`,
        message: `Congratulations! You have been awarded ${prizePts.toLocaleString()} bonus points for your #${rank} ranking in the Leaderboard!`,
        is_read: false,
      });

      distributedCount++;
      totalAwarded += prizePts;
    }

    // 2. Reset leaderboard points if requested
    if (resetPoints) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ leaderboard_points: 0 })
        .gt("leaderboard_points", 0);

      config.lastResetDate = new Date().toISOString();
      saveLeaderboardConfig(config);
    }

    await logAdminAudit({
      action: "distribute_leaderboard_rewards",
      category: "rewards",
      details: `Awarded ${totalAwarded.toLocaleString()} points to ${distributedCount} top competitors.${resetPoints ? " Points reset to 0." : ""}`,
    });

    revalidatePath("/admin/ranks");
    revalidatePath("/leaderboard");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Successfully distributed ${totalAwarded.toLocaleString()} pts to ${distributedCount} winners!`,
    };
  } catch (err) {
    console.error("distributeLeaderboardRewardsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to distribute prizes.",
    };
  }
}
