"use client";

import { useMemo } from "react";
import StartOfferButton from "@/components/StartOfferButton";
import OfferIcon from "@/components/OfferIcon";
import { getCountryDisplayName, isOfferEligibleForCountry } from "@/lib/geo-utils";
import type { OffersPlatformConfig } from "@/lib/offers-config-types";

type Offer = {
  id: string;
  icon: string | null;
  provider_name: string;
  title: string;
  description: string | null;
  category: string;
  offer_type: string;
  reward_points: number;
  reward_usd: number | null;
  countries: string[];
  devices: string[];
  featured: boolean;
  popular: boolean;
  priority: number;
  tracking_url: string | null;
};

function money(value: number | null) {
  return value == null ? "" : `≈ $${Number(value).toFixed(2)}`;
}

export default function OfferWall({
  offers,
  availablePoints,
  profileCountry,
  partnerOfferwallsSlot,
  offersConfig,
  userIdNumber,
}: {
  offers: Offer[];
  availablePoints: number;
  profileCountry: string;
  partnerOfferwallsSlot?: React.ReactNode;
  offersConfig?: OffersPlatformConfig;
  userIdNumber?: string | number;
}) {
  const topOffers = useMemo(() => {
    const eligible = offers.filter((o) => isOfferEligibleForCountry(o.countries, profileCountry));

    return [...eligible].sort((a, b) => {
      if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured);
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.reward_points - a.reward_points;
    });
  }, [offers, profileCountry]);

  return (
    <>
      <div className="market-header">
        <div>
          <span className="eyebrow">
            💎 Offer wall
          </span>

          <h1>Earn Points</h1>

          <p className="muted">
            Offers currently available in your
            RewardNova marketplace. Availability is
            controlled by each offer&apos;s GEO and
            device rules.
          </p>
        </div>

        <div className="market-balance card">
          <span className="stat-label">
            Available balance
          </span>

          <strong>
            {availablePoints.toLocaleString()} pts
          </strong>

          <span className="muted">
            ≈ $
            {(availablePoints / 1000).toFixed(2)}
          </span>
        </div>
      </div>

      {profileCountry && (
        <div
          className="info-banner"
          style={{
            marginTop: 0,
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <span>📍 Offers matched to your IP location: </span>
            <strong>{getCountryDisplayName(profileCountry)}</strong>
          </div>
          <span
            className="badge"
            style={{
              fontSize: "11px",
              background: "rgba(59, 130, 246, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              color: "#93c5fd",
            }}
          >
            🔒 IP LOCKED · NON-CHANGEABLE
          </span>
        </div>
      )}

      {topOffers.length > 0 && (
        <section className="dashboard-section" style={{ marginBottom: 28 }}>
          <div className="section-head" style={{ marginBottom: 14 }}>
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 4px", fontSize: "18px" }}>
                🔥 Top Offers
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                  }}
                >
                  {offersConfig?.topOffersMode?.toLowerCase().includes("automatic")
                    ? "Trending"
                    : offersConfig?.topOffersMode?.toLowerCase().includes("hybrid")
                    ? "Top Picks"
                    : "Featured"}
                </span>
              </h2>
              <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                High-reward offers available in your region.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
            {topOffers.map((offer) => (
              <article
                key={`top-${offer.id}`}
                className="card"
                style={{
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  background: "linear-gradient(180deg, rgba(245, 158, 11, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)",
                  borderRadius: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <OfferIcon icon={offer.icon} title={offer.title} />
                      <div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            fontWeight: 600,
                          }}
                        >
                          {offer.provider_name}
                        </div>
                        <span className="badge" style={{ fontSize: "10px", padding: "1px 6px" }}>
                          {offer.offer_type}
                        </span>
                      </div>
                    </div>
                    {offer.featured && (
                      <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 700 }}>
                        ★ Top
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      margin: "0 0 6px",
                      lineHeight: "1.3",
                    }}
                  >
                    {offer.title}
                  </h3>

                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--muted)",
                      margin: "0 0 12px",
                      lineHeight: "1.4",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {offer.description || "Complete the qualifying activity according to provider terms."}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "10px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    marginTop: "auto",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "#86efac", fontSize: "14px" }}>
                      +{offer.reward_points.toLocaleString()} pts
                    </div>
                    {offer.reward_usd != null && (
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                        {money(offer.reward_usd)}
                      </div>
                    )}
                  </div>

                  <StartOfferButton
                    offerId={offer.id}
                    trackingUrl={offer.tracking_url ?? ""}
                    countryCode={profileCountry}
                    source="top_offers_shelf"
                    disabled={!offer.tracking_url}
                    buttonClassName="btn btn-primary"
                    buttonText="Start →"
                    userIdNumber={userIdNumber}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {partnerOfferwallsSlot}
    </>
  );
}
