"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function DemoProviderContent() {
  const searchParams = useSearchParams();

  const clickId = searchParams.get("click_id");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080d1c",
        color: "#f5f7ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "620px",
          background: "#111a2d",
          border: "1px solid #263452",
          borderRadius: "20px",
          padding: "40px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,.35)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: "10px 16px",
            borderRadius: "999px",
            background: "#211d45",
            color: "#a78bfa",
            fontWeight: 700,
            marginBottom: "20px",
          }}
        >
          RewardNova Demo Provider
        </div>

        <h1
          style={{
            fontSize: "38px",
            margin: "0 0 16px",
          }}
        >
          Complete this demo offer
        </h1>

        <p
          style={{
            color: "#9fb0d0",
            fontSize: "18px",
            lineHeight: 1.6,
            marginBottom: "28px",
          }}
        >
          This is a development-only offer used to test RewardNova's
          click tracking and conversion system.
        </p>

        <div
          style={{
            background: "#0b1324",
            borderRadius: "14px",
            padding: "20px",
            marginBottom: "24px",
            textAlign: "left",
          }}
        >
          <strong>Demo reward</strong>

          <div
            style={{
              fontSize: "30px",
              fontWeight: 800,
              color: "#6ee7b7",
              marginTop: "8px",
            }}
          >
            25,000 points
          </div>

          <div
            style={{
              color: "#9fb0d0",
              marginTop: "4px",
            }}
          >
            Equivalent to $25.00
          </div>
        </div>

        {clickId ? (
          <div
            style={{
              background: "#0b1324",
              border: "1px solid #263452",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "24px",
              textAlign: "left",
              fontSize: "13px",
              color: "#8fa2c4",
              wordBreak: "break-all",
            }}
          >
            <strong style={{ color: "#dce5f7" }}>Click ID</strong>
            <br />
            {clickId}
          </div>
        ) : (
          <div
            style={{
              color: "#fca5a5",
              marginBottom: "20px",
            }}
          >
            No click ID was provided.
          </div>
        )}

        <button
          type="button"
          disabled={!clickId}
          onClick={() => {
            if (!clickId) return;

            window.location.href =
              `/api/demo-conversion?click_id=${encodeURIComponent(clickId)}`;
          }}
          style={{
            width: "100%",
            border: 0,
            borderRadius: "12px",
            padding: "16px",
            fontSize: "17px",
            fontWeight: 800,
            cursor: clickId ? "pointer" : "not-allowed",
            background: clickId
              ? "linear-gradient(90deg,#7c5cff,#9b7cff)"
              : "#39445a",
            color: "#fff",
          }}
        >
          Complete Demo Offer →
        </button>

        <div style={{ marginTop: "22px" }}>
          <Link
            href="/earn"
            style={{
              color: "#9fb0d0",
              textDecoration: "none",
            }}
          >
            ← Back to Earn
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function DemoProviderPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            background: "#080d1c",
            color: "#f5f7ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div>Loading Demo Provider...</div>
        </main>
      }
    >
      <DemoProviderContent />
    </Suspense>
  );
}