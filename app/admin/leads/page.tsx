import React from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import LeadsManager, { AdminLeadRecord } from "./LeadsManager";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  // Query real conversions from database
  const { data: conversions } = await supabaseAdmin
    .from("conversions")
    .select("*, offers(title, category)")
    .order("created_at", { ascending: false });

  // Query auth.users, user_profiles, and clicks to match metadata
  const [authUsersRes, profilesRes, clicksRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin.from("user_profiles").select("id, display_name, country_code, available_points"),
    supabaseAdmin.from("offer_clicks").select("click_id, country_code, device_type, user_agent"),
  ]);

  const emailMap = new Map<string, string>();
  (authUsersRes.data?.users ?? []).forEach((u) => {
    emailMap.set(u.id, u.email ?? "");
  });

  const profileMap = new Map<string, { display_name: string; country_code: string; available_points: number }>();
  (profilesRes.data ?? []).forEach((p) => {
    profileMap.set(p.id, {
      display_name: p.display_name || "",
      country_code: p.country_code || "BD",
      available_points: Number(p.available_points ?? 0),
    });
  });

  const clickMap = new Map<string, { country_code: string; device_type?: string; user_agent?: string }>();
  (clicksRes.data ?? []).forEach((c) => {
    if (c.click_id) {
      clickMap.set(c.click_id, {
        country_code: c.country_code || "BD",
        device_type: c.device_type,
        user_agent: c.user_agent,
      });
    }
  });

  const formattedLeads: AdminLeadRecord[] = (conversions ?? []).map((c) => {
    const userEmail = emailMap.get(c.user_id) || "user@example.com";
    const profile = profileMap.get(c.user_id);
    const click = c.click_id ? clickMap.get(c.click_id) : undefined;
    const userName = profile?.display_name || userEmail.split("@")[0] || "User";
    const country = click?.country_code || profile?.country_code || "BD";

    return {
      id: c.id,
      click_id: c.click_id || null,
      provider_conversion_id: c.provider_conversion_id || null,
      provider_name: c.provider_name || null,
      user_id: c.user_id,
      user_name: userName,
      user_email: userEmail,
      user_balance: profile?.available_points ?? 0,
      offer_name: c.offers?.title || c.provider_name || "Offer Conversion",
      type: c.offers?.category || "offer",
      status: c.status || "approved",
      points: Number(c.reward_points ?? 0),
      payout_usd: Number(c.payout_usd ?? 0),
      ip_address: "127.0.0.1",
      country_code: country,
      device_type: click?.device_type || "Desktop",
      created_at: new Date(c.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      raw_created_at: c.created_at,
    };
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayCount = (conversions ?? []).filter(
    (c) => new Date(c.created_at) >= startOfToday
  ).length;

  return (
    <LeadsManager
      initialLeads={formattedLeads}
      totalLeadsCount={formattedLeads.length}
      todayLeadsCount={todayCount}
    />
  );
}
