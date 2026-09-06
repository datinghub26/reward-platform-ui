import React from "react";
import { getLevelTiers, calculateUserLevel } from "@/lib/levels";
import { supabaseAdmin } from "@/lib/supabase/admin";
import LevelsManager from "./LevelsManager";

export const dynamic = "force-dynamic";

export default async function AdminLevelsPage() {
  const tiers = getLevelTiers();

  // Fetch real users to calculate levels distribution
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("id, lifetime_points");

  const memberCountsByLevel: Record<number, number> = {};
  tiers.forEach((t) => {
    memberCountsByLevel[t.level] = 0;
  });

  const totalMembers = profiles?.length || 0;

  (profiles ?? []).forEach((p) => {
    const pts = Number(p.lifetime_points ?? 0);
    const { currentTier } = calculateUserLevel(pts);
    memberCountsByLevel[currentTier.level] = (memberCountsByLevel[currentTier.level] || 0) + 1;
  });

  return (
    <LevelsManager
      initialTiers={tiers}
      memberCountsByLevel={memberCountsByLevel}
      totalMembers={totalMembers}
    />
  );
}
