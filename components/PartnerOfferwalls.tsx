"use client";

import React, { useState } from "react";
import { StoredProvider } from "@/lib/providers-store";

interface PartnerOfferwallsProps {
  providers: StoredProvider[];
  userId: string;
}

export function buildLaunchUrl(template: string, userId: string): string {
  return template
    .replace(/\{user_id\}/gi, encodeURIComponent(userId))
    .replace(/\{userid\}/gi, encodeURIComponent(userId))
    .replace(/\{userId\}/g, encodeURIComponent(userId))
    .replace(/\[USER_ID\]/gi, encodeURIComponent(userId))
    .replace(/\{sub_id\}/gi, encodeURIComponent(userId))
    .replace(/\{subid\}/gi, encodeURIComponent(userId));
}

export default function PartnerOfferwalls({
  providers,
  userId,
}: PartnerOfferwallsProps) {
  const [activeProvider, setActiveProvider] = useState<StoredProvider | null>(null);
  const [filter, setFilter] = useState<"all" | "offer" | "survey">("all");

  const activeProviders = providers.filter((p) => p.active);
  const filtered = activeProviders.filter((p) => {
    if (filter === "all") return true;
    return p.type === filter;
  });

  return (
    <section style={{ marginBottom: "36px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#ffffff",
              margin: "0 0 4px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>🌐</span> Partner Offerwalls & Surveys
          </h2>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Complete tasks, watch videos, and take surveys directly inside partner networks.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "offer", "survey"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              style={{
                background: filter === mode ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${filter === mode ? "rgba(34, 197, 94, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                color: filter === mode ? "#4ade80" : "var(--muted)",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.15s ease",
              }}
            >
              {mode === "all" ? "All Networks" : mode === "offer" ? "Offerwalls" : "Surveys"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Provider Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "18px",
        }}
      >
        {filtered.map((prov) => {
          const launchUrl = buildLaunchUrl(prov.url, userId);

          return (
            <div
              key={prov.id}
              className="card"
              style={{
                backgroundColor: "var(--panel)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "14px",
                position: "relative",
                overflow: "hidden",
                transition: "transform 0.15s ease, border-color 0.15s ease",
              }}
            >
              {/* Top Accent Glow Bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  backgroundColor: prov.color || "#22c55e",
                  opacity: 0.8,
                }}
              />

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "20px",
                    }}
                  >
                    {prov.logo || "🌐"}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {prov.badge && (
                      <span
                        style={{
                          backgroundColor: "rgba(34, 197, 94, 0.15)",
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                          color: "#4ade80",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        {prov.badge}
                      </span>
                    )}
                    <span
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        color: "var(--muted)",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        textTransform: "uppercase",
                      }}
                    >
                      {prov.type}
                    </span>
                  </div>
                </div>

                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {prov.name}
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "var(--muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {prov.description || "High-paying mobile apps, tasks, and reward offers."}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div style={{ fontSize: "12px", color: "#facc15", fontWeight: 700 }}>
                  ★ {prov.rate || "5.0"}
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveProvider(prov)}
                  style={{
                    padding: "7px 14px",
                    fontSize: "12px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Open Wall</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Offerwall Modal Dialog */}
      {activeProvider && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(4, 8, 16, 0.88)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1100px",
              height: "90vh",
              backgroundColor: "var(--panel)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                height: "60px",
                padding: "0 24px",
                backgroundColor: "var(--panel-2)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "22px" }}>{activeProvider.logo || "🌐"}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#ffffff", fontWeight: 700 }}>
                    {activeProvider.name} Offerwall
                  </h3>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Reward credits automatically apply to your account upon completion.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <a
                  href={`/offerwall/${encodeURIComponent(activeProvider.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    fontSize: "12px",
                    padding: "6px 12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Open in New Tab</span>
                  <span>↗</span>
                </a>

                <button
                  type="button"
                  onClick={() => setActiveProvider(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "none",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    color: "#ffffff",
                    fontSize: "16px",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                  }}
                  title="Close Offerwall"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Iframe Viewport */}
            <div style={{ flex: 1, position: "relative", backgroundColor: "#0b1322" }}>
              <iframe
                src={buildLaunchUrl(activeProvider.url, userId)}
                title={`${activeProvider.name} Offerwall`}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                allow="camera; microphone; geolocation"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
