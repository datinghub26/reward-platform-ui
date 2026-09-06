import React from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuditLogs } from "@/lib/audit-logger";
import LogsManager, { UnifiedLogRecord } from "./LogsManager";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  // 1. Fetch admin audit logs
  const auditLogs = getAuditLogs();

  // 2. Fetch live data from Supabase
  const [conversionsRes, withdrawalsRes, ledgerRes, usersRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("conversions")
      .select("id, user_id, reward_points, payout_usd, status, provider_name, created_at, offers(title)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("withdrawals")
      .select("id, user_id, method, points_spent, amount_usd, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("reward_ledger")
      .select("id, user_id, points, balance_after, entry_type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin.from("user_profiles").select("id, display_name"),
  ]);

  const emailMap = new Map<string, string>();
  (usersRes.data?.users ?? []).forEach((u) => {
    emailMap.set(u.id, u.email ?? "");
  });

  const nameMap = new Map<string, string>();
  (profilesRes.data ?? []).forEach((p) => {
    nameMap.set(p.id, p.display_name || "");
  });

  const getUserLabel = (uid: string) => {
    const email = emailMap.get(uid);
    const name = nameMap.get(uid);
    if (name && email) return `${name} (${email})`;
    if (email) return email;
    if (name) return name;
    return `User #${uid.slice(0, 8)}`;
  };

  const unifiedLogs: UnifiedLogRecord[] = [];

  // Add Admin Audits
  auditLogs.forEach((l) => {
    unifiedLogs.push({
      id: l.id,
      timestamp: l.timestamp,
      category: "admin",
      action: l.action.replace(/_/g, " ").toUpperCase(),
      user: l.adminEmail || "admin@rewardnova.com",
      details: l.details,
      status: "success",
      metadata: l.category,
    });
  });

  // Add Postback Conversions
  (conversionsRes.data ?? []).forEach((c) => {
    const offerTitle = (c.offers as any)?.title || "Offer completion";
    unifiedLogs.push({
      id: `conv-${c.id}`,
      timestamp: c.created_at,
      category: "postback",
      action: `OFFER ${c.status.toUpperCase()}`,
      user: getUserLabel(c.user_id),
      details: `${offerTitle} via ${c.provider_name || "Provider"} (+${Number(c.reward_points).toLocaleString()} pts, $${Number(c.payout_usd || 0).toFixed(2)})`,
      status: c.status === "approved" ? "success" : c.status === "pending" ? "pending" : "reversed",
      metadata: `ID: ${c.id.slice(0, 8)}`,
    });
  });

  // Add Withdrawals
  (withdrawalsRes.data ?? []).forEach((w) => {
    unifiedLogs.push({
      id: `wd-${w.id}`,
      timestamp: w.created_at,
      category: "withdrawal",
      action: `WITHDRAWAL ${w.status.toUpperCase()}`,
      user: getUserLabel(w.user_id),
      details: `Requested $${Number(w.amount_usd).toFixed(2)} via ${w.method.toUpperCase()} (${Number(w.points_spent).toLocaleString()} pts)`,
      status: w.status === "paid" || w.status === "approved" ? "success" : w.status === "pending" ? "pending" : "failed",
      metadata: `ID: ${w.id.slice(0, 8)}`,
    });
  });

  // Add Manual / Special Ledger adjustments
  (ledgerRes.data ?? []).forEach((leg) => {
    if (leg.description && (leg.description.toLowerCase().includes("admin") || leg.description.toLowerCase().includes("manual") || leg.description.toLowerCase().includes("prize") || leg.description.toLowerCase().includes("refund"))) {
      unifiedLogs.push({
        id: `leg-${leg.id}`,
        timestamp: leg.created_at,
        category: "ledger",
        action: `LEDGER ${leg.entry_type.toUpperCase()}`,
        user: getUserLabel(leg.user_id),
        details: `${leg.description} (${leg.entry_type === "credit" ? "+" : "-"}${Number(leg.points).toLocaleString()} pts)`,
        status: "success",
        metadata: `Bal: ${Number(leg.balance_after).toLocaleString()}`,
      });
    }
  });

  // Sort unified logs by timestamp desc
  unifiedLogs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return <LogsManager initialLogs={unifiedLogs} />;
}
