import Link from "next/link";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import { getActiveCashoutMethods } from "@/lib/cashouts";
import WithdrawForm from "./WithdrawForm";

export const dynamic = "force-dynamic";

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(val: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(val));
  } catch {
    return val;
  }
}

export default async function WithdrawPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile, error },
    { data: userWithdrawals },
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("available_points, pending_points, lifetime_points")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("withdrawals")
      .select("id, amount_usd, amount_points, payment_method, status, created_at, processed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  if (error) {
    console.error("Failed to load withdrawal balance:", error);
  }

  const availablePoints = Number(profile?.available_points ?? 0);
  const withdrawals = userWithdrawals ?? [];

  return (
    <div className="dashboard-shell">
      <AppSidebar active="withdraw" />

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">💸 Payouts</span>
            <h1>Withdraw your rewards</h1>
            <div className="muted">
              Request a payout from your available RewardNova balance.
            </div>
          </div>

          <Link className="btn" href="/dashboard">
            ← Dashboard
          </Link>
        </div>

        <WithdrawForm
          availablePoints={availablePoints}
          methods={getActiveCashoutMethods()}
        />

        {withdrawals.length > 0 && (
          <section className="dashboard-section" style={{ marginTop: 32 }}>
            <div className="section-head">
              <div>
                <h2>Your withdrawal requests</h2>
                <p>Track the status of your requested payouts.</p>
              </div>
            </div>

            <div className="card" style={{ padding: "8px 16px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {withdrawals.map((item) => {
                  const isPaid = item.status === "paid" || item.status === "completed" || item.status === "approved";
                  const isProcessing = item.status === "processing";
                  const isPending = item.status === "pending";
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 0",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "15px", display: "block" }}>
                          ${Number(item.amount_usd ?? 0).toFixed(2)} via {String(item.payment_method).toUpperCase()}
                        </strong>
                        <span className="muted" style={{ fontSize: "12px" }}>
                          {formatPoints(Number(item.amount_points ?? 0))} pts · Requested on {formatDate(item.created_at)}
                        </span>
                      </div>

                      <span
                        className="badge"
                        style={{
                          fontSize: "11px",
                          background: isPaid
                            ? "rgba(34, 197, 94, 0.15)"
                            : isProcessing
                              ? "rgba(59, 130, 246, 0.15)"
                              : isPending
                                ? "rgba(234, 179, 8, 0.15)"
                                : "rgba(239, 68, 68, 0.15)",
                          color: isPaid ? "#86efac" : isProcessing ? "#93c5fd" : isPending ? "#fde047" : "#fca5a5",
                          border: `1px solid ${
                            isPaid
                              ? "rgba(34, 197, 94, 0.3)"
                              : isProcessing
                                ? "rgba(59, 130, 246, 0.3)"
                                : isPending
                                  ? "rgba(234, 179, 8, 0.3)"
                                  : "rgba(239, 68, 68, 0.3)"
                          }`,
                        }}
                      >
                        {(item.status || "pending").toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
