"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemPromoCodeAction } from "@/app/actions/rewards";
import { playRewardSound } from "@/lib/sound";

export default function PromoCodeWidget() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await redeemPromoCodeAction(code);
      if (res.success) {
        playRewardSound();
        setFeedback({
          type: "success",
          message: res.message || `+${res.points?.toLocaleString()} points added!`,
        });
        setCode("");
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to redeem promo code.",
        });
      }
    });
  };

  return (
    <div
      className="card promo-widget-card"
      style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "14px",
        padding: "20px",
        marginBottom: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <span style={{ fontSize: "18px" }}>🎟️</span>
        <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#ffffff" }}>
          Redeem Promo Code
        </h2>
      </div>
      <p style={{ margin: "0 0 14px 0", fontSize: "13px", color: "var(--muted, #94a3b8)" }}>
        Have a promotional voucher or community bonus code? Enter it below to claim instant points.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. WELCOME2026"
          disabled={isPending}
          style={{
            flex: "1 1 200px",
            padding: "10px 14px",
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isPending || !code.trim()}
          className="btn btn-primary"
          style={{
            padding: "10px 20px",
            fontSize: "13px",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {isPending ? "Validating..." : "Claim Points →"}
        </button>
      </form>

      {feedback && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            backgroundColor: feedback.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${feedback.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: feedback.type === "success" ? "#86efac" : "#fca5a5",
          }}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
