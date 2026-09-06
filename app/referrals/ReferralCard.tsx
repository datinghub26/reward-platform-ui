"use client";

import { useState, useEffect } from "react";

type ReferralCardProps = {
  referralCode: string;
  referralUrl: string;
  commissionRate?: number;
  signupBonus?: number;
};

export default function ReferralCard({
  referralCode,
  referralUrl,
  commissionRate = 10,
  signupBonus = 100,
}: ReferralCardProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [clientOrigin, setClientOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setClientOrigin(window.location.origin);
    }
  }, []);

  const effectiveReferralUrl =
    clientOrigin && !clientOrigin.includes("localhost")
      ? `${clientOrigin}/register?ref=${referralCode}`
      : (referralUrl && !referralUrl.includes("localhost")
          ? referralUrl
          : `https://www.rewardnova.shop/register?ref=${referralCode}`);

  async function copyToClipboard(text: string, isCode: boolean) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      if (isCode) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      if (isCode) setCopiedCode(true);
      else setCopiedLink(true);
      setTimeout(() => {
        setCopiedCode(false);
        setCopiedLink(false);
      }, 2500);
    }
  }

  const shareText = encodeURIComponent(
    `Join RewardNova and earn gift cards, crypto, and cash rewards! Use my invite code ${referralCode} or sign up directly:`
  );
  const shareUrl = encodeURIComponent(effectiveReferralUrl);

  return (
    <section className="card" style={{ marginBottom: 24, padding: "24px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>
            Your Personal Invitation Link & Code
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Your Code:</span>
            <button
              type="button"
              onClick={() => copyToClipboard(referralCode, true)}
              style={{
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                color: "#c7d2fe",
                padding: "4px 10px",
                borderRadius: "6px",
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
              title="Click to copy referral code"
            >
              {referralCode} {copiedCode ? "✓" : "📋"}
            </button>
          </div>
        </div>
        <p className="muted" style={{ margin: "8px 0 0", fontSize: "14px" }}>
          Share your link with friends. You earn <strong>{commissionRate}% lifetime commission</strong> on all their completed offers
          {signupBonus > 0 ? `, and they get +${signupBonus} bonus points on signup!` : "!"}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: "260px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "10px",
            padding: "12px 16px",
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#93c5fd",
            wordBreak: "break-all",
          }}
        >
          {effectiveReferralUrl}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => copyToClipboard(effectiveReferralUrl, false)}
          style={{ minWidth: "120px" }}
        >
          {copiedLink ? "✓ Copied!" : "📋 Copy Link"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", color: "var(--muted)" }}>Share via:</span>

        <a
          href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          💬 WhatsApp
        </a>

        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          🐦 X / Twitter
        </a>

        <a
          href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          ✈️ Telegram
        </a>

        <a
          href={`mailto:?subject=Join%20RewardNova&body=${shareText}%20${shareUrl}`}
          className="btn"
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          ✉️ Email
        </a>
      </div>
    </section>
  );
}

