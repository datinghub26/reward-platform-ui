import React from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserNumericIdMapAsync } from "@/lib/user-ids";
import UserManager, { AdminUserRecord } from "./UserManager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // Fetch real users from user_profiles
  const { data: profiles, count } = await supabaseAdmin
    .from("user_profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Query auth.users to match emails
  const {
    data: { users: authUsers },
  } = await supabaseAdmin.auth.admin.listUsers();

  // Query admin_users to match real admin roles
  const { data: adminRows } = await supabaseAdmin
    .from("admin_users")
    .select("user_id");

  const adminSet = new Set((adminRows ?? []).map((r) => r.user_id));

  const emailMap = new Map<string, string>();
  (authUsers ?? []).forEach((u) => {
    emailMap.set(u.id, u.email ?? "");
  });

  const numericIdMap = await getUserNumericIdMapAsync();

  const formattedUsers: AdminUserRecord[] = (profiles ?? []).map((p) => {
    const numId = numericIdMap[p.id] || 0;
    return {
      id: p.id,
      numeric_id: numId,
      display_name: numId ? `User #${numId}` : (p.display_name || (emailMap.get(p.id) ? emailMap.get(p.id)!.split("@")[0] : "User")),
      email: emailMap.get(p.id) || "user@example.com",
      role: (adminSet.has(p.id) ? "admin" : "user") as "admin" | "user",
      level: adminSet.has(p.id) ? 100 : 1,
      points: Number(p.available_points ?? 0),
      lifetime_points: Number(p.lifetime_points ?? 0),
      status: ((p.status as "active" | "suspended" | "banned") || "active") as "active" | "suspended" | "banned",
      verified: true,
      privacy: true,
      country_code: p.country_code || "BD",
      created_at: p.created_at,
    };
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const realBannedCount = (profiles ?? []).filter((p) => p.status === "banned").length;
  const realTodayCount = (profiles ?? []).filter(
    (p) => new Date(p.created_at) >= startOfToday
  ).length;

  return (
    <UserManager
      initialUsers={formattedUsers}
      totalCount={formattedUsers.length}
      todayCount={realTodayCount}
      bannedCount={realBannedCount}
    />
  );
}
