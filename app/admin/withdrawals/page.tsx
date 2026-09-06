import { supabaseAdmin } from "@/lib/supabase/admin";
import WithdrawalManager, { Withdrawal } from "./WithdrawalManager";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsPage() {
  const { data: withdrawals } = await supabaseAdmin
    .from("withdrawals")
    .select("*")
    .order("created_at", { ascending: false });

  const {
    data: { users: authUsers },
  } = await supabaseAdmin.auth.admin.listUsers();

  const emailMap = new Map<string, string>();
  (authUsers ?? []).forEach((u) => {
    emailMap.set(u.id, u.email ?? "");
  });

  const rows: Withdrawal[] = (withdrawals ?? []).map((item) => ({
    id: item.id,
    user_id: item.user_id,
    user_name: emailMap.get(item.user_id) ? emailMap.get(item.user_id)!.split("@")[0] : undefined,
    user_email: emailMap.get(item.user_id),
    amount_usd: Number(item.amount_usd ?? 0),
    amount_points: Number(item.amount_points ?? Math.round(Number(item.amount_usd ?? 0) * 1000)),
    payment_method: item.payment_method ?? "TRX",
    payment_details:
      item.payment_details && typeof item.payment_details === "object"
        ? (item.payment_details as { value?: string })
        : null,
    status: item.status ?? "pending",
    admin_note: item.admin_note ?? null,
    created_at: new Date(item.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }));

  return <WithdrawalManager withdrawals={rows} />;
}