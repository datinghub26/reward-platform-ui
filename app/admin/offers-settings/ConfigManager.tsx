"use client";

import React, { useState } from "react";
import { OffersPlatformConfig, ProviderNetworkConfig } from "@/lib/offers-config-types";
import { saveOffersConfigAction } from "./actions";

interface ConfigManagerProps {
  initialConfig: OffersPlatformConfig;
}

export default function ConfigManager({ initialConfig }: ConfigManagerProps) {
  const [activeTab, setActiveTab] = useState("Top Offers");
  const [topOffersMode, setTopOffersMode] = useState(initialConfig.topOffersMode);
  const [maxOffers, setMaxOffers] = useState(initialConfig.maxOffers);
  const [rankingMetric, setRankingMetric] = useState(initialConfig.rankingMetric);
  const [providerConfigs, setProviderConfigs] = useState<Record<string, ProviderNetworkConfig>>(
    initialConfig.providerConfigs || {}
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // List of provider IDs sorted consistently
  const providerIds = Object.keys(providerConfigs);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      const res = await saveOffersConfigAction({
        topOffersMode,
        maxOffers,
        rankingMetric,
        providerConfigs,
      });

      if (res.success && res.config) {
        setProviderConfigs(res.config.providerConfigs);
        setSavedMessage("Offers and provider network settings saved successfully!");
        setTimeout(() => {
          setSavedMessage(null);
        }, 3500);
      } else {
        setErrorMessage(res.error || "Failed to save configuration");
      }
    } catch {
      setErrorMessage("An unexpected network error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentProvider = activeTab !== "Top Offers" ? providerConfigs[activeTab] : null;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Config</h1>
      </div>

      <div className="admin-table-container" style={{ padding: "24px" }}>
        {/* Network & Config Tabs */}
        <div className="admin-tabs-container">
          <button
            type="button"
            className={`admin-tab ${activeTab === "Top Offers" ? "active" : ""}`}
            onClick={() => setActiveTab("Top Offers")}
          >
            Top Offers
          </button>
          {providerIds.map((id) => {
            const p = providerConfigs[id];
            return (
              <button
                key={id}
                type="button"
                className={`admin-tab ${activeTab === id ? "active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                {p?.name || id}
                {!p?.active && (
                  <span
                    style={{
                      marginLeft: "6px",
                      fontSize: "10px",
                      color: "#ef4444",
                      background: "rgba(239, 68, 68, 0.15)",
                      padding: "1px 6px",
                      borderRadius: "10px",
                    }}
                  >
                    Off
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {savedMessage && (
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: "8px",
              color: "#4ade80",
              fontSize: "13px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>✓</span>
            <span>{savedMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              color: "#f87171",
              fontSize: "13px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>✕</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          {activeTab === "Top Offers" ? (
            <div>
              {/* Top Offers Mode */}
              <div className="admin-form-group">
                <label className="admin-form-label">Top Offers Mode</label>
                <select
                  className="admin-form-select"
                  value={topOffersMode}
                  onChange={(e) => setTopOffersMode(e.target.value)}
                >
                  <option value="Manual (Only Admin Selected Offers)">
                    Manual (Only Admin Selected Offers)
                  </option>
                  <option value="Automatic (Dynamic Highest Converting)">
                    Automatic (Dynamic Highest Converting)
                  </option>
                  <option value="Hybrid (Pinned + Highest Converting)">
                    Hybrid (Pinned + Highest Converting)
                  </option>
                </select>
                <div className="admin-form-help">
                  Choose whether Top Offers are chosen automatically, manually by admin, or hybrid.
                </div>
              </div>

              {/* Maximum Offers Displayed */}
              <div className="admin-form-group">
                <label className="admin-form-label">Maximum Offers Displayed</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={maxOffers}
                  onChange={(e) => setMaxOffers(Number(e.target.value))}
                  min={1}
                  max={50}
                />
                <div className="admin-form-help">
                  The maximum number of offers shown in the Top Offers section.
                </div>
              </div>

              {/* Automatic Ranking Metric */}
              <div className="admin-form-group">
                <label className="admin-form-label">Automatic Ranking Metric</label>
                <select
                  className="admin-form-select"
                  value={rankingMetric}
                  onChange={(e) => setRankingMetric(e.target.value)}
                >
                  <option value="Most Completed (Conversions)">
                    Most Completed (Conversions)
                  </option>
                  <option value="Highest Payout (USD)">
                    Highest Payout (USD)
                  </option>
                  <option value="Highest Click-Through Rate (CTR)">
                    Highest Click-Through Rate (CTR)
                  </option>
                </select>
                <div className="admin-form-help">
                  The metric used to rank top converting offers in automatic or hybrid mode.
                </div>
              </div>
            </div>
          ) : (
            currentProvider && (
              <div>
                <h3 style={{ margin: "0 0 16px", color: "#ffffff", fontSize: "16px" }}>
                  {currentProvider.name} Network Integration Settings
                </h3>

                <div className="admin-form-group">
                  <label className="admin-form-label">API Publisher ID / App Key</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={currentProvider.apiKey}
                    placeholder="Enter publisher ID, placement key, or app token"
                    onChange={(e) =>
                      setProviderConfigs({
                        ...providerConfigs,
                        [activeTab]: {
                          ...currentProvider,
                          apiKey: e.target.value,
                        },
                      })
                    }
                  />
                  <div className="admin-form-help">
                    Official identifier assigned by {currentProvider.name} for RewardNova.
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Postback Security Token / Secret</label>
                  <input
                    type="password"
                    className="admin-form-input"
                    value={currentProvider.secret}
                    placeholder="Enter secret postback token"
                    onChange={(e) =>
                      setProviderConfigs({
                        ...providerConfigs,
                        [activeTab]: {
                          ...currentProvider,
                          secret: e.target.value,
                        },
                      })
                    }
                  />
                  <div className="admin-form-help">
                    Secret used to verify HTTP postback signatures at /api/postback
                  </div>
                </div>

                <div
                  className="admin-form-group"
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <label className="admin-switch">
                    <input
                      type="checkbox"
                      checked={currentProvider.active}
                      onChange={(e) =>
                        setProviderConfigs({
                          ...providerConfigs,
                          [activeTab]: {
                            ...currentProvider,
                            active: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="admin-switch-slider" />
                  </label>
                  <span style={{ fontSize: "13px", color: "#ffffff" }}>
                    Enable {currentProvider.name} in User Marketplace
                  </span>
                </div>
              </div>
            )
          )}

          <div style={{ marginTop: "28px" }}>
            <button
              type="submit"
              className="admin-btn-pill"
              disabled={isSaving}
              style={{ opacity: isSaving ? 0.7 : 1, cursor: isSaving ? "not-allowed" : "pointer" }}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
