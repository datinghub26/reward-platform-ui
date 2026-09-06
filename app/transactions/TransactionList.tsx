"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export type LedgerEntry = {
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

export default function TransactionList({
  transactions,
}: {
  transactions: LedgerEntry[];
}) {
  const [filter, setFilter] = useState<"all" | "credit" | "debit" | "reversal">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((item) => {
      const matchesFilter =
        filter === "all" ? true : item.entry_type === filter;

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        getEntryLabel(item.entry_type).toLowerCase().includes(q) ||
        String(Math.abs(item.points)).includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, search]);

  function handleExportCsv() {
    if (transactions.length === 0) return;

    const headers = ["ID", "Date", "Type", "Description", "Points", "Balance After"];
    const rows = filtered.map((t) => [
      `"${t.id}"`,
      `"${new Date(t.created_at).toISOString()}"`,
      `"${t.entry_type}"`,
      `"${(t.description || getEntryLabel(t.entry_type)).replace(/"/g, '""')}"`,
      t.points,
      t.balance_after,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `rewardnova-statement-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn ${filter === "all" ? "btn-primary" : ""}`}
            onClick={() => setFilter("all")}
            style={{ padding: "6px 14px", fontSize: "13px" }}
          >
            All ({transactions.length})
          </button>
          <button
            type="button"
            className={`btn ${filter === "credit" ? "btn-primary" : ""}`}
            onClick={() => setFilter("credit")}
            style={{ padding: "6px 14px", fontSize: "13px" }}
          >
            💰 Rewards (Credits)
          </button>
          <button
            type="button"
            className={`btn ${filter === "debit" ? "btn-primary" : ""}`}
            onClick={() => setFilter("debit")}
            style={{ padding: "6px 14px", fontSize: "13px" }}
          >
            💸 Withdrawals (Debits)
          </button>
          <button
            type="button"
            className={`btn ${filter === "reversal" ? "btn-primary" : ""}`}
            onClick={() => setFilter("reversal")}
            style={{ padding: "6px 14px", fontSize: "13px" }}
          >
            ↩️ Reversals
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            className="input"
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              width: "180px",
            }}
          />

          {transactions.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={handleExportCsv}
              title="Download CSV statement"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                fontSize: "13px",
              }}
            >
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="card activity">
        {filtered.length > 0 ? (
          filtered.map((transaction) => {
            const isCredit = transaction.entry_type === "credit";
            const isReversal = transaction.entry_type === "reversal";
            const points = Math.abs(transaction.points);

            return (
              <div className="activity-row" key={transaction.id}>
                <div className="activity-left">
                  <div className="activity-icon">
                    {getEntryIcon(transaction.entry_type)}
                  </div>

                  <div>
                    <strong>
                      {transaction.description ||
                        getEntryLabel(transaction.entry_type)}
                    </strong>

                    <div className="muted">
                      {getEntryLabel(transaction.entry_type)} ·{" "}
                      {formatDate(transaction.created_at)}
                      {transaction.balance_after != null && (
                        <span> · Balance after: {formatPoints(transaction.balance_after)} pts</span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={
                    isCredit
                      ? "positive"
                      : isReversal
                      ? "warning-text"
                      : "negative"
                  }
                  style={{ fontWeight: 600, fontSize: "15px" }}
                >
                  {isCredit ? "+" : "-"}
                  {formatPoints(points)} pts
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <strong>No matching transactions</strong>
            <p>
              {transactions.length === 0
                ? "Your reward and withdrawal activity will appear here."
                : "No transactions match the selected filter."}
            </p>
            {transactions.length === 0 && (
              <Link className="btn btn-primary" href="/earn">
                Browse Offers
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
