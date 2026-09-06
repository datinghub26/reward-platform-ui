import React from "react";
import { getLeaderboardConfig } from "@/lib/leaderboard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import RanksManager, { RankCompetitor } from "./RanksManager";

export const dynamic = "force-dynamic";

export default async function AdminRanksPage() {
  const config = getLeaderboardConfig();

  const [profilesRes, authUsersRes] = await Promise.all([
    supabaseAdmin
      .from("user_profiles")
      .select("id, display_name, country_code, leaderboard_points, available_points")
      .order("leaderboard_points", { ascending: false })
      .limit(25),
    supabaseAdmin.auth.admin.listUsers(),
  ]);

  const emailMap = new Map<string, string>();
  (authUsersRes.data?.users ?? []).forEach((u) => {
    emailMap.set(u.id, u.email ?? "");
  });

  const competitors: RankCompetitor[] = (profilesRes.data ?? []).map((p, idx) => {
    const email = emailMap.get(p.id) || "user@rewardnova.com";
    const name = p.display_name?.trim() || email.split("@")[0] || `Member #${idx + 1}`;

    return {
      id: p.id,
      rank: idx + 1,
      displayName: name,
      email,
      countryCode: p.country_code || "US",
      leaderboardPoints: Number(p.leaderboard_points ?? 0),
      availablePoints: Number(p.available_points ?? 0),
    };
  });

  return <RanksManager initialConfig={config} competitors={competitors} />;
}
