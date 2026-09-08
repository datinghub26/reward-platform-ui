import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import "./admin.css";

import { verifyAdminSession } from "@/lib/supabase/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await verifyAdminSession();

  if (!auth.user) {
    redirect("/login?next=/admin");
  }

  if (!auth.isAdmin) {
    redirect("/dashboard");
  }

  const user = auth.user;

  // Fetch count badges for sidebar (e.g. pending leads, pending withdrawals, open tickets)
  const [conversionsRes, pendingWithdrawalsRes, openTicketsRes] = await Promise.all([
    supabaseAdmin
      .from("conversions")
      .select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
  ]);

  const leadsCount = conversionsRes.count ?? 0;
  const requestsCount = pendingWithdrawalsRes.count ?? 0;
  const ticketsCount = openTicketsRes.count ?? 0;

  return (
    <div className="admin-shell">
      <AdminSidebar leadsCount={leadsCount} requestsCount={requestsCount} ticketsCount={ticketsCount} />
      <div className="admin-main-wrap">
        <AdminHeader userEmail={user.email ?? "admin@rewardnova.com"} />
        <main className="admin-content-area">{children}</main>
      </div>
    </div>
  );
}
