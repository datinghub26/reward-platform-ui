"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CashoutMethod, DEFAULT_METHODS } from "@/lib/cashout-types";

type WithdrawFormProps = {
  availablePoints: number;
  methods?: CashoutMethod[];
};

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function WithdrawForm({
  availablePoints,
  methods = DEFAULT_METHODS,
}: WithdrawFormProps) {
  const router = useRouter();

  // Active methods fallback
  const activeMethods = methods.filter((m) => m.status === true);
  const initialMethod = activeMethods[0] || DEFAULT_METHODS[0];

  const [selectedMethod, setSelectedMethod] = useState<CashoutMethod>(initialMethod);
  const [amount, setAmount] = useState(String(initialMethod.minimum || 1000));
  const [paymentDetails, setPaymentDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const amountPoints = Number(amount) || 0;
  const grossUsd = amountPoints / 1000;

  const handleSelectMethod = (m: CashoutMethod) => {
    setSelectedMethod(m);
    setError("");
    setMessage("");
    // If current amount is less than new method's minimum, adjust upward
    if (amountPoints < m.minimum) {
      setAmount(String(m.minimum));
    }
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!Number.isInteger(amountPoints) || amountPoints <= 0) {
      setError("Please enter a valid points amount.");
      return;
    }

    if (amountPoints < selectedMethod.minimum) {
      setError(
        `The minimum withdrawal for ${selectedMethod.name} is ${formatPoints(
          selectedMethod.minimum
        )} points ($${(selectedMethod.minimum / 1000).toFixed(2)}).`
      );
      return;
    }

    if (amountPoints > availablePoints) {
      setError(
        `You only have ${formatPoints(availablePoints)} points available.`
      );
      return;
    }

    if (!paymentDetails.trim()) {
      setError(`Please provide your ${selectedMethod.name} payout address or email.`);
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_points: amountPoints,
          payment_method: selectedMethod.name,
          payment_details: {
            value: paymentDetails.trim(),
            method_id: selectedMethod.id,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data?.error || "Unable to create withdrawal request."
        );
      }

      setMessage(
        `Withdrawal request for ${formatPoints(amountPoints)} points ($${grossUsd.toFixed(
          2
        )}) via ${selectedMethod.name} submitted successfully!`
      );

      setPaymentDetails("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting the withdrawal."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Top Stat Cards */}
      <section className="stats dashboard-stats">
        <div className="card balance-card">
          <div className="stat-label">Available balance</div>
          <div className="stat-value">
            {formatPoints(availablePoints)} pts
          </div>
          <div className="stat-sub">
            ≈ ${(availablePoints / 1000).toFixed(2)} USD ready to withdraw
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Selected Method Minimum</div>
          <div className="stat-value" style={{ color: "var(--admin-green)" }}>
            {formatPoints(selectedMethod.minimum)} pts
          </div>
          <div className="stat-sub">
            ≈ ${(selectedMethod.minimum / 1000).toFixed(2)} USD ({selectedMethod.name})
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Processing Fee</div>
          <div className="stat-value" style={{ color: "#4ade80" }}>
            {selectedMethod.fee || "0%"}
          </div>
          <div className="stat-sub">
            Fast payout processing
          </div>
        </div>
      </section>

      {/* Main Form Section */}
      <section className="dashboard-section" style={{ marginTop: "28px" }}>
        <div className="section-head">
          <div>
            <h2>Request a payout</h2>
            <p>Choose your preferred payment method and enter payout details.</p>
          </div>
        </div>

        <div className="card" style={{ padding: "28px" }}>
          {message && (
            <div
              style={{
                padding: "14px 18px",
                backgroundColor: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.35)",
                borderRadius: "10px",
                color: "#4ade80",
                fontSize: "14px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span>✓</span>
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "14px 18px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "10px",
                color: "#f87171",
                fontSize: "14px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "24px" }}>
              {/* 1. Payment Method Selection */}
              <div>
                <label
                  className="stat-label"
                  style={{ display: "block", marginBottom: "12px", fontSize: "13px" }}
                >
                  Select Payment Method
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {activeMethods.map((m) => {
                    const isSelected = selectedMethod.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMethod(m)}
                        style={{
                          border: isSelected
                            ? "2px solid var(--admin-green, #22c55e)"
                            : "1px solid rgba(255,255,255,0.1)",
                          backgroundColor: isSelected
                            ? "rgba(34, 197, 94, 0.08)"
                            : "rgba(255,255,255,0.02)",
                          borderRadius: "12px",
                          padding: "16px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "24px" }}>{m.logo}</span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              backgroundColor: "rgba(255,255,255,0.08)",
                              color: "var(--admin-text-muted)",
                            }}
                          >
                            {m.category}
                          </span>
                        </div>

                        <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "15px" }}>
                          {m.name}
                        </div>

                        <div style={{ fontSize: "12px", color: "var(--admin-text-dim)" }}>
                          Min: <strong style={{ color: "#86efac" }}>{formatPoints(m.minimum)} pts</strong> (${(m.minimum / 1000).toFixed(2)})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Amount to withdraw */}
              <div>
                <label
                  htmlFor="amount"
                  className="stat-label"
                  style={{ display: "block", marginBottom: "8px", fontSize: "13px" }}
                >
                  Amount to withdraw (Points)
                </label>

                <div style={{ position: "relative" }}>
                  <input
                    id="amount"
                    type="number"
                    min={selectedMethod.minimum}
                    max={availablePoints}
                    step="10"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder={String(selectedMethod.minimum)}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "inherit",
                      fontSize: "16px",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "var(--admin-text-muted)",
                  }}
                >
                  <span>
                    Minimum: <strong>{formatPoints(selectedMethod.minimum)} pts</strong> (${(selectedMethod.minimum / 1000).toFixed(2)})
                  </span>
                  <span>
                    Gross payout: <strong style={{ color: "var(--admin-green)" }}>${grossUsd.toFixed(2)} USD</strong>
                  </span>
                </div>
              </div>

              {/* 3. Destination Payment Details */}
              <div>
                <label
                  htmlFor="paymentDetails"
                  className="stat-label"
                  style={{ display: "block", marginBottom: "8px", fontSize: "13px" }}
                >
                  {selectedMethod.payment_title || `Enter your ${selectedMethod.name} address`}
                </label>

                <input
                  id="paymentDetails"
                  type="text"
                  value={paymentDetails}
                  onChange={(event) => setPaymentDetails(event.target.value)}
                  placeholder={
                    selectedMethod.category === "Fiat"
                      ? "e.g. your-paypal@email.com"
                      : `e.g. your ${selectedMethod.name} wallet address`
                  }
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    color: "inherit",
                    fontSize: "15px",
                    fontFamily: selectedMethod.category === "Crypto" ? "monospace" : "inherit",
                  }}
                />
                <div style={{ fontSize: "12px", color: "var(--admin-text-dim)", marginTop: "6px" }}>
                  Please double check your payout address. Funds sent to incorrect addresses cannot be recovered.
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: "8px" }}>
                <button
                  type="submit"
                  disabled={submitting || availablePoints < selectedMethod.minimum}
                  className="btn"
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    fontSize: "15px",
                    fontWeight: 700,
                    borderRadius: "12px",
                    cursor:
                      submitting || availablePoints < selectedMethod.minimum
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      submitting || availablePoints < selectedMethod.minimum
                        ? 0.6
                        : 1,
                  }}
                >
                  {submitting
                    ? "Submitting Payout Request..."
                    : availablePoints < selectedMethod.minimum
                    ? `Minimum ${formatPoints(selectedMethod.minimum)} Points Required`
                    : `Withdraw $${grossUsd.toFixed(2)} via ${selectedMethod.name}`}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}