"use client";

import { useMemo, useState } from "react";
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
}: {
  offers: Offer[];
  availablePoints: number;
  profileCountry: string;
  partnerOfferwallsSlot?: React.ReactNode;
  offersConfig?: OffersPlatformConfig;
}) {
  const [category, setCategory] = useState("All");
  const [device, setDevice] = useState("All");
  const [sort, setSort] = useState("recommended");
  const [search, setSearch] = useState("");

  const devices = useMemo(() => {
    const values = new Set<string>();

    offers.forEach((offer) => {
      offer.devices.forEach((item) => values.add(item));
    });

    return [...values].sort();
  }, [offers]);

  const categories = useMemo(() => {
    const values = new Set<string>();

    offers.forEach((offer) => values.add(offer.category));

    return [
      "All",
      "Featured",
      ...[...values].sort(),
    ];
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = offers.filter((offer) => {
      const categoryMatch =
        category === "All" ||
        (category === "Featured"
          ? offer.featured
          : offer.category === category);

      // Offer matching strictly depends on verified IP country (locked)
      const countryMatch = isOfferEligibleForCountry(
        offer.countries,
        profileCountry
      );

      const deviceMatch =
        device === "All" ||
        offer.devices.includes(device);

      const searchMatch =
        !query ||
        `${offer.title} ${
          offer.description ?? ""
        } ${offer.provider_name} ${offer.offer_type}`
          .toLowerCase()
          .includes(query);

      return (
        categoryMatch &&
        countryMatch &&
        deviceMatch &&
        searchMatch
      );
    });

    return [...result].sort((a, b) => {
      if (sort === "highest") {
        return b.reward_points - a.reward_points;
      }

      if (sort === "lowest") {
        return a.reward_points - b.reward_points;
      }

      if (sort === "newest") {
        return b.priority - a.priority;
      }

      return (
        Number(b.featured) -
          Number(a.featured) ||
        Number(b.popular) -
          Number(a.popular) ||
        b.priority - a.priority ||
        b.reward_points - a.reward_points
      );
    });
  }, [
    offers,
    category,
    profileCountry,
    device,
    sort,
    search,
  ]);

  const clearFilters = () => {
    setCategory("All");
    setDevice("All");
    setSort("recommended");
    setSearch("");
  };

  const topOffers = useMemo(() => {
    if (!offersConfig) return [];
    const mode = offersConfig.topOffersMode || "Manual";
    const max = Math.max(1, offersConfig.maxOffers || 6);

    const eligible = offers.filter((o) => isOfferEligibleForCountry(o.countries, profileCountry));

    if (mode.toLowerCase().includes("manual")) {
      const manualList = eligible.filter((o) => o.featured || o.popular);
      const pool = manualList.length > 0 ? manualList : eligible;
      return [...pool]
        .sort((a, b) => Number(b.featured) - Number(a.featured) || b.priority - a.priority || b.reward_points - a.reward_points)
        .slice(0, max);
    } else if (mode.toLowerCase().includes("automatic")) {
      return [...eligible]
        .sort((a, b) => b.reward_points - a.reward_points || b.priority - a.priority)
        .slice(0, max);
    } else {
      return [...eligible]
        .sort((a, b) => {
          if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured);
          return b.reward_points - a.reward_points || b.priority - a.priority;
        })
        .slice(0, max);
    }
  }, [offers, offersConfig, profileCountry]);

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

      {partnerOfferwallsSlot}

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
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="earn-toolbar">
        <div className="earn-search">
          <span>⌕</span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search offers, apps, surveys..."
            aria-label="Search offers"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="earn-toolbar-note">
          <span className="live-dot" />
          {filteredOffers.length} available
        </div>
      </section>

      <div
        className="category-tabs"
        aria-label="Offer categories"
      >
        {categories.map((item) => (
          <button
            key={item}
            className={`category-tab ${
              category === item
                ? "selected"
                : ""
            }`}
            type="button"
            onClick={() => setCategory(item)}
          >
            {item}

            {item === "Featured" && (
              <span className="tab-star">
                ★
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="filter-bar card">
        <label>
          <span>Country (Locked to IP)</span>
          <input
            className="input"
            value={`${getCountryDisplayName(profileCountry)} 🔒`}
            readOnly
            disabled
            style={{
              cursor: "not-allowed",
              opacity: 0.85,
              fontWeight: 600,
              fontSize: "13px",
            }}
            title="Offers are strictly matched to your verified IP location and cannot be changed."
          />
        </label>

        <label>
          <span>Device</span>

          <select
            value={device}
            onChange={(event) =>
              setDevice(event.target.value)
            }
          >
            <option value="All">
              All devices
            </option>

            {devices.map((item) => (
              <option
                value={item}
                key={item}
              >
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Reward</span>

          <select
            value={
              sort === "highest" ||
              sort === "lowest"
                ? sort
                : "any"
            }
            onChange={(event) => {
              const value =
                event.target.value;

              setSort(
                value === "highest" ||
                  value === "lowest"
                  ? value
                  : "recommended"
              );
            }}
          >
            <option value="any">
              Any reward
            </option>

            <option value="highest">
              Highest reward
            </option>

            <option value="lowest">
              Lowest reward
            </option>
          </select>
        </label>

        <label>
          <span>Sort by</span>

          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value)
            }
          >
            <option value="recommended">
              Recommended
            </option>

            <option value="newest">
              Priority
            </option>

            <option value="highest">
              Highest reward
            </option>

            <option value="lowest">
              Lowest reward
            </option>
          </select>
        </label>
      </div>

      <div className="active-filters">
        <div>
          <strong>
            {filteredOffers.length} opportunities
          </strong>
        </div>

        {(
          category !== "All" ||
          device !== "All" ||
          search
        ) && (
          <button
            className="clear-filters"
            type="button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {filteredOffers.length > 0 ? (
        <section className="market-grid">
          {filteredOffers.map((offer) => (
            <article
              className="market-offer card"
              key={offer.id}
            >
              <div className="market-offer-top">
                <OfferIcon icon={offer.icon} title={offer.title} />

                <div className="offer-provider-wrap">
                  <span className="badge">
                    {offer.offer_type}
                  </span>

                  <div className="provider">
                    {offer.provider_name}
                  </div>
                </div>

                {offer.featured && (
                  <span className="featured-badge">
                    ★ Featured
                  </span>
                )}
              </div>

              <h2>{offer.title}</h2>

              <p>
                {offer.description ||
                  "Complete the qualifying activity according to the provider terms."}
              </p>

              <div className="offer-tags">
                {offer.countries.length === 0 ? (
                  <span>🌎 Worldwide</span>
                ) : (
                  offer.countries.map((item) => (
                    <span key={`c-${item}`}>
                      {getCountryDisplayName(item)}
                    </span>
                  ))
                )}

                {offer.devices.map(
                  (item) => (
                    <span
                      key={`d-${item}`}
                    >
                      {item}
                    </span>
                  )
                )}
              </div>

              <div className="market-offer-bottom">
                <div>
                  <div className="reward compact">
                    {offer.reward_points.toLocaleString()}{" "}
                    pts
                  </div>

                  {offer.reward_usd != null && (
                    <small className="muted">
                      {money(
                        offer.reward_usd
                      )}
                    </small>
                  )}
                </div>

                <StartOfferButton
                  offerId={offer.id}
                  trackingUrl={offer.tracking_url ?? ""}
                  countryCode={profileCountry}
                  source="earn_wall"
                  disabled={!offer.tracking_url}
                  buttonClassName="btn btn-primary"
                  buttonText="View Offer →"
                />
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="card empty-state">
          <strong>
            No offers match your filters
          </strong>

          <p>
            No offers currently match your selected filters for {getCountryDisplayName(profileCountry)}.
            Try resetting your category, device, or search terms.
          </p>

          <button
            className="btn"
            type="button"
            onClick={clearFilters}
          >
            Reset filters
          </button>
        </div>
      )}
    </>
  );
}
