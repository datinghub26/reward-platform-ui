"use client";

import React, { useState, useMemo } from "react";
import { StoredProvider } from "@/lib/providers-store";
import {
  saveProviderAction,
  deleteProviderAction,
  toggleProviderAction,
} from "./actions";

interface ProviderManagerProps {
  initialProviders: StoredProvider[];
}

export default function ProviderManager({ initialProviders }: ProviderManagerProps) {
  const [providers, setProviders] = useState<StoredProvider[]>(initialProviders);
  const [activeTab, setActiveTab] = useState<"All" | "Offer" | "Survey">("All");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"offer" | "survey">("offer");
  const [formBadge, setFormBadge] = useState("80%");
  const [formUrl, setFormUrl] = useState("");
  const [formShowRate, setFormShowRate] = useState(true);
  const [formRate, setFormRate] = useState("5");
  const [formActive, setFormActive] = useState(true);
  const [formDescription, setFormDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (activeTab !== "All" && p.type.toLowerCase() !== activeTab.toLowerCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q);
      }
      return true;
    });
  }, [providers, activeTab, search]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleActive = async (id: string) => {
    // Optimistic UI update
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
    const res = await toggleProviderAction(id);
    if (res.success && res.providers) {
      setProviders(res.providers);
      showToast("Offerwall status updated");
    } else if (res.error) {
      showToast(`Error: ${res.error}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? It will also be removed from the user Earn page.`)) {
      return;
    }
    setLoading(true);
    setProviders((prev) => prev.filter((p) => p.id !== id));
    const res = await deleteProviderAction(id);
    setLoading(false);
    if (res.success && res.providers) {
      setProviders(res.providers);
      showToast(`Provider ${name} removed from website earn wall.`);
    } else if (res.error) {
      showToast(`Error: ${res.error}`);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormName("");
    setFormType("offer");
    setFormBadge("80%");
    setFormUrl("");
    setFormShowRate(true);
    setFormRate("5");
    setFormActive(true);
    setFormDescription("");
    setModalOpen(true);
  };

  const openEditModal = (prov: StoredProvider) => {
    setEditingId(prov.id);
    setFormName(prov.name);
    setFormType(prov.type);
    setFormBadge(prov.badge || "");
    setFormUrl(prov.url);
    setFormShowRate(prov.show_rate);
    setFormRate(prov.rate || "5");
    setFormActive(prov.active);
    setFormDescription(prov.description || "");
    setModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setLoading(true);
    const providerId = editingId || formName.toLowerCase().replace(/[^a-z0-9]/g, "-") || `prov-${Date.now()}`;

    const updatedRecord: StoredProvider = {
      id: providerId,
      name: formName.trim(),
      type: formType,
      badge: formBadge.trim(),
      active: formActive,
      url: formUrl.trim() || "https://example.com/offerwall?user_id={user_id}",
      show_rate: formShowRate,
      rate: formRate.trim() || "5",
      logo: formType === "survey" ? "📊" : "⚡",
      description: formDescription.trim() || "High-paying reward offers and tasks.",
      color: "#22c55e",
    };

    const res = await saveProviderAction(updatedRecord);
    setLoading(false);
    if (res.success && res.providers) {
      setProviders(res.providers);
      setModalOpen(false);
      showToast(editingId ? `Provider ${formName} updated successfully.` : `Provider ${formName} added to marketplace.`);
    } else if (res.error) {
      showToast(`Error: ${res.error}`);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredProviders.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Providers</h1>
        <button
          className="admin-btn-pill"
          onClick={openNewModal}
        >
          New Provider
        </button>
      </div>

      {toast && (
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
          <span>{toast}</span>
        </div>
      )}

      {/* Tabs Selector */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <div
          style={{
            backgroundColor: "var(--admin-card-inner)",
            border: "1px solid var(--admin-border)",
            borderRadius: "20px",
            padding: "4px",
            display: "inline-flex",
            gap: "4px",
          }}
        >
          {(["All", "Offer", "Survey"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "#202a3c" : "none",
                color: activeTab === tab ? "#ffffff" : "var(--admin-text-muted)",
                border: "none",
                borderRadius: "16px",
                padding: "6px 16px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "var(--admin-text-dim)",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21 16-4 4-4-4"/>
              <path d="M17 20V4"/>
              <path d="m3 8 4-4 4 4"/>
              <path d="M7 4v16"/>
            </svg>
          </button>

          <div className="admin-search-input-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredProviders.length > 0 &&
                      selectedIds.size === filteredProviders.length
                    }
                  />
                </th>
                <th>Image</th>
                <th>Name</th>
                <th>Type</th>
                <th>Badge</th>
                <th>Active</th>
                <th>URL</th>
                <th>Show Rate</th>
                <th>Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProviders.map((prov) => (
                <tr key={prov.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(prov.id)}
                      onChange={() => handleSelectOne(prov.id)}
                    />
                  </td>
                  <td>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        backgroundColor: "#161e2e",
                        border: "1px solid var(--admin-border)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "13px",
                      }}
                    >
                      {prov.logo || "🌐"}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: "#ffffff" }}>
                    {prov.name}
                  </td>
                  <td>
                    <span className="admin-pill pill-type-offer">
                      🏷️ {prov.type}
                    </span>
                  </td>
                  <td>
                    {prov.badge ? (
                      <span
                        style={{
                          backgroundColor: "rgba(220, 38, 38, 0.15)",
                          border: "1px solid rgba(220, 38, 38, 0.3)",
                          color: "#f87171",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {prov.badge}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={prov.active}
                        onChange={() => handleToggleActive(prov.id)}
                      />
                      <span className="admin-switch-slider" />
                    </label>
                  </td>
                  <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "11px", color: "var(--admin-text-dim)" }}>
                    {prov.url}
                  </td>
                  <td>
                    {prov.show_rate ? (
                      <span style={{ color: "var(--admin-green)", fontSize: "14px" }}>✓</span>
                    ) : (
                      <span style={{ color: "var(--admin-red)", fontSize: "14px", opacity: 0.7 }}>⊘</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{prov.rate}</td>
                  <td>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        className="admin-action-btn action-green"
                        title="Edit Provider"
                        type="button"
                        onClick={() => openEditModal(prov)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        </svg>
                        <span>Edit</span>
                      </button>
                      <button
                        className="admin-action-btn action-red"
                        title="Delete Provider"
                        type="button"
                        onClick={() => handleDelete(prov.id, prov.name)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <div>
            Showing 1 to {filteredProviders.length} of {providers.length} results
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span>Per page 10 ⌄</span>
          </div>
        </div>
      </div>

      {/* Edit & Create Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--admin-card)",
              border: "1px solid var(--admin-border)",
              borderRadius: "14px",
              padding: "28px",
              width: "520px",
              maxWidth: "92%",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#ffffff", fontSize: "18px" }}>
              {editingId ? `Edit Provider: ${formName}` : "Add New Provider Offerwall"}
            </h3>
            <form onSubmit={handleSaveModal}>
              <div className="admin-form-group">
                <label className="admin-form-label">Provider Name *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Klink, Adswedmedia, Gemlads, Clickwall"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Provider Type</label>
                  <select
                    className="admin-form-select"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as "offer" | "survey")}
                  >
                    <option value="offer">Offerwall</option>
                    <option value="survey">Surveys</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Badge Tag</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. 80%, HOT, NEW"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Iframe / Offerwall URL *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="https://provider.com/wall?pub_id=...&user_id={user_id}"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                />
                <div className="admin-form-help">
                  Use <code>&#123;user_id&#125;</code> as the placeholder for authenticated member ID.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Show Rating</label>
                  <select
                    className="admin-form-select"
                    value={formShowRate ? "yes" : "no"}
                    onChange={(e) => setFormShowRate(e.target.value === "yes")}
                  >
                    <option value="yes">Yes (Show Rate)</option>
                    <option value="no">No (Hide)</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Score / Rate</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. 5 or 0/5"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Description (Shown on Earn Page)</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. High-paying mobile apps and tasks."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="admin-form-group" style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
                <label className="admin-switch">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                  />
                  <span className="admin-switch-slider" />
                </label>
                <span style={{ fontSize: "13px", color: "#ffffff", fontWeight: 600 }}>
                  Active in Live Member Marketplace
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="admin-tab"
                  disabled={loading}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-pill" disabled={loading}>
                  {loading ? "Saving..." : editingId ? "Save Changes" : "Create Provider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
