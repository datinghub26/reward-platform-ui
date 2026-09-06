import React from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import TicketManager, { TicketItem } from "./TicketManager";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  // 1. Fetch support tickets ordered by updated_at / created_at desc
  const { data: ticketsData, error: ticketsErr } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (ticketsErr) {
    console.error("Error fetching support tickets:", ticketsErr);
  }

  // 2. Query user profiles and auth users to resolve names and emails
  const [authUsersRes, profilesRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin.from("user_profiles").select("id, display_name"),
  ]);

  const emailMap = new Map<string, string>();
  (authUsersRes.data?.users ?? []).forEach((u) => {
    emailMap.set(u.id, u.email ?? "");
  });

  const nameMap = new Map<string, string>();
  (profilesRes.data ?? []).forEach((p) => {
    nameMap.set(p.id, p.display_name || "");
  });

  const formattedTickets: TicketItem[] = (ticketsData ?? []).map((t) => {
    const email = emailMap.get(t.user_id) || "user@rewardnova.com";
    const name = nameMap.get(t.user_id) || email.split("@")[0] || "Member";

    return {
      id: t.id,
      userId: t.user_id,
      userName: name,
      userEmail: email,
      subject: t.subject || "Support Inquiry",
      message: t.message || "",
      status: (t.status as "open" | "in_progress" | "resolved" | "closed") || "open",
      createdAt: t.created_at || new Date().toISOString(),
      updatedAt: t.updated_at || t.created_at || new Date().toISOString(),
    };
  });

  return <TicketManager initialTickets={formattedTickets} />;
}
