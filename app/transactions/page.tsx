import Link from "next/link";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import TransactionList from "./TransactionList";
import { createClient } from "@/lib/supabase/server";

type LedgerEntry = {
  id: string;
  user_id: string;
  entry_type: string;
  points: number;
  balance_after: number;
  description: string | null;
  created_at: string;
};

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getEntryIcon(entryType: string) {
  switch (entryType) {
    case "credit":
      return "💰";
    case "debit":
      return "💸";
    case "reversal":
      return "↩️";
    case "adjustment":
      return "⚖️";
    default:
      return "✨";
  }
}

function getEntryLabel(entryType: string) {
  switch (entryType) {
    case "credit":
      return "Reward Credit";
    case "debit":
      return "Withdrawal";
    case "reversal":
      return "Offer Reversal";
    case "adjustment":
      return "Balance Adjustment";
    default:
      return entryType;
  }
}

export default async function TransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("available_points, lifetime_points")
    .eq("id", user.id)
    .maybeSingle();

  const { data: ledger, error } = await supabase
    .from("reward_ledger")
    .select(
      `
        id,
        user_id,
        entry_type,
        points,
        balance_after,
        description,
        created_at
      `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div className="dashboard-shell">
        <AppSidebar active="transactions" />

        <main className="dashboard-main">
          <div className="dashboard-top">
            <div>
              <span className="eyebrow">📋 Transactions</span>
              <h1>Transaction history</h1>
              <div className="muted">
                View your RewardNova points activity and balance changes.
              </div>
            </div>

            <Link className="btn" href="/dashboard">
              ← Dashboard
            </Link>
          </div>

          <section className="dashboard-section">
            <div className="card admin-error">
              <div className="admin-error-icon">⚠️</div>
              <h2>Unable to load transactions</h2>
              <p className="muted">
                We could not load your transaction history.
              </p>
              <pre>{error.message}</pre>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const transactions: LedgerEntry[] = (ledger ?? []).map((item) => ({
    id: item.id,
    user_id: item.user_id,
    entry_type: item.entry_type ?? "",
    points: Number(item.points ?? 0),
    balance_after: Number(item.balance_after ?? 0),
    description: item.description ?? null,
    created_at: item.created_at,
  }));

  const totalCredits = Number(profile?.lifetime_points ?? 0);

  const totalDebits = transactions
    .filter((item) => item.entry_type === "debit")
    .reduce((total, item) => total + Math.abs(item.points), 0);

  const currentBalance = Number(profile?.available_points ?? 0);

  return (
    <div className="dashboard-shell">
      <AppSidebar active="transactions" />

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">📋 Transactions</span>
            <h1>Transaction history</h1>
            <div className="muted">
              A complete record of your RewardNova points activity.
            </div>
          </div>

          <Link className="btn" href="/dashboard">
            ← Dashboard
          </Link>
        </div>

        <section className="stats dashboard-stats">
          <div className="card">
            <div className="stat-label">Current balance</div>
            <div className="stat-value">
              {formatPoints(currentBalance)} pts
            </div>
            <div className="stat-sub">
              ≈ ${(currentBalance / 1000).toFixed(2)}
            </div>
          </div>

          <div className="card">
            <div className="stat-label">Total earned</div>
            <div className="stat-value positive">
              +{formatPoints(totalCredits)} pts
            </div>
            <div className="stat-sub">
              Rewards credited to your account
            </div>
          </div>

          <div className="card">
            <div className="stat-label">Total withdrawn</div>
            <div className="stat-value negative">
              -{formatPoints(totalDebits)} pts
            </div>
            <div className="stat-sub">
              Points removed for withdrawals
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <h2>All transactions</h2>
              <p>Your latest points credits and debits.</p>
            </div>
          </div>

          <TransactionList transactions={transactions} />
        </section>

        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <h2>How your balance works</h2>
              <p>
                RewardNova keeps a ledger of every points movement.
              </p>
            </div>
          </div>

          <div className="quick-grid">
            <div className="card quick">
              <span>💰</span>
              <strong>Credits</strong>
              <small>
                Completed rewards add points to your balance.
              </small>
            </div>

            <div className="card quick">
              <span>💸</span>
              <strong>Withdrawals</strong>
              <small>
                Approved withdrawal requests appear as debit transactions.
              </small>
            </div>

            <div className="card quick">
              <span>📊</span>
              <strong>Balance tracking</strong>
              <small>
                Each ledger entry records your balance after the transaction.
              </small>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
