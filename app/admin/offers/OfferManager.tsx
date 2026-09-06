"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OfferIcon from "@/components/OfferIcon";
import { createOffer, updateOffer, toggleOfferStatus, deleteOffer } from "./actions";

export type AdminOffer = {
  id: string;
  provider_name: string;
  title: string;
  description: string | null;
  category: string;
  offer_type: string;
  icon: string | null;
  reward_points: number;
  reward_usd: number | null;
  countries: string[];
  devices: string[];
  tracking_url: string;
  status: string;
  featured: boolean;
  popular: boolean;
  created_at: string;
};

export default function OfferManager({
  initialOffers,
}: {
  initialOffers: AdminOffer[];
}) {
  const router = useRouter();
  const [offers, setOffers] = useState<AdminOffer[]>(initialOffers);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [providerName, setProviderName] = useState("RewardNova");
  const [category, setCategory] = useState("CPA");
  const [rewardPoints, setRewardPoints] = useState("5000");
  const [rewardUsd, setRewardUsd] = useState("5.00");
  const [icon, setIcon] = useState("🎁");
  const [trackingUrl, setTrackingUrl] = useState("http://localhost:3000/demo-provider?click_id={click_id}");
  const [countriesInput, setCountriesInput] = useState("ALL");
  const [devices, setDevices] = useState<string[]>(["Desktop", "Mobile"]);
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [popular, setPopular] = useState(false);
  const [status, setStatus] = useState("active");

  function openCreateModal() {
    setEditingOffer(null);
    setTitle("");
    setProviderName("RewardNova");
    setCategory("CPA");
    setRewardPoints("5000");
    setRewardUsd("5.00");
    setIcon("🎁");
    setTrackingUrl("https://www.rewardnova.shop/demo-provider?click_id={click_id}");
    setCountriesInput("ALL");
    setDevices(["Desktop", "Mobile"]);
    setDescription("Complete the qualifying activity to receive your reward.");
    setFeatured(false);
    setPopular(false);
    setStatus("active");
    setActionError("");
    setActionSuccess("");
    setIsModalOpen(true);
  }

  function openEditModal(offer: AdminOffer) {
    setEditingOffer(offer);
    setTitle(offer.title);
    setProviderName(offer.provider_name);
    setCategory(offer.category || "CPA");
    setRewardPoints(String(offer.reward_points));
    setRewardUsd(String(offer.reward_usd ?? offer.reward_points / 1000));
    setIcon(offer.icon || "🎁");
    setTrackingUrl(offer.tracking_url || "");
    setCountriesInput(offer.countries.length === 0 ? "ALL" : offer.countries.join(", "));
    setDevices(offer.devices.length > 0 ? offer.devices : ["Desktop", "Mobile"]);
    setDescription(offer.description || "");
    setFeatured(Boolean(offer.featured));
    setPopular(Boolean(offer.popular));
    setStatus(offer.status || "active");
    setActionError("");
    setActionSuccess("");
    setIsModalOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setActionError("");
    setActionSuccess("");

    const parsedCountries = countriesInput.trim().toUpperCase() === "ALL" || !countriesInput.trim()
      ? []
      : countriesInput.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

    const payload = {
      title,
      provider_name: providerName,
      category,
      offer_type: category,
      reward_points: Number(rewardPoints),
      reward_usd: Number(rewardUsd),
      icon,
      tracking_url: trackingUrl,
      countries: parsedCountries,
      devices,
      description,
      featured,
      popular,
      status,
    };

    if (editingOffer) {
      const res = await updateOffer(editingOffer.id, payload);
      if (!res.success) {
        setActionError(res.error || "Failed to update offer.");
      } else {
        setActionSuccess("Offer updated successfully!");
        setOffers((prev) =>
          prev.map((o) =>
            o.id === editingOffer.id ? { ...o, ...payload, reward_usd: Number(rewardUsd) } : o
          )
        );
        router.refresh();
        setTimeout(() => setIsModalOpen(false), 1200);
      }
    } else {
      const res = await createOffer(payload);
      if (!res.success || !res.offer) {
        setActionError(res.error || "Failed to create offer.");
      } else {
        setActionSuccess("New offer created and added to marketplace!");
        setOffers((prev) => [res.offer, ...prev]);
        router.refresh();
        setTimeout(() => setIsModalOpen(false), 1200);
      }
    }
    setSubmitting(false);
  }

  async function handleToggleStatus(offer: AdminOffer) {
    const nextStatus = offer.status === "active" ? "paused" : "active";
    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, status: nextStatus } : o))
    );
    const res = await toggleOfferStatus(offer.id, offer.status);
    if (!res?.success) {
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, status: offer.status } : o))
      );
      alert(res?.error || "Failed to update offer status.");
    }
    router.refresh();
  }

  async function handleDelete(offer: AdminOffer) {
    if (!window.confirm(`Are you sure you want to delete offer "${offer.title}"?`)) {
      return;
    }
    const res = await deleteOffer(offer.id);
    if (res?.success) {
      setOffers((prev) => prev.filter((o) => o.id !== offer.id));
      router.refresh();
    } else {
      alert(res?.error || "Failed to delete offer.");
    }
  }

  const filteredOffers = offers.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.provider_name.toLowerCase().includes(search.toLowerCase());

    const matchesCat = categoryFilter === "all" || item.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input"
            type="text"
            placeholder="Search offers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "200px", padding: "8px 12px", fontSize: "13px" }}
          />

          <select
            className="input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: "8px 12px", fontSize: "13px" }}
          >
            <option value="all">All Categories</option>
            <option value="CPA">CPA</option>
            <option value="Survey">Survey</option>
            <option value="Apps">Apps</option>
            <option value="Games">Games</option>
            <option value="Signups">Signups</option>
          </select>

          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px", fontSize: "13px" }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>➕</span> Add New Offer
        </button>
      </div>

      <section className="admin-card" style={{ marginTop: 0 }}>
        <div className="admin-card-header">
          <div>
            <h2>Marketplace Offers ({filteredOffers.length})</h2>
            <p>Active and configured offers shown to users on the Offer Wall.</p>
          </div>
        </div>

        <div className="withdrawal-table-wrap">
          <table className="withdrawal-table">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Offer Details</th>
                <th>Category</th>
                <th>Reward Points</th>
                <th>Payout</th>
                <th>GEO / Devices</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.length > 0 ? (
                filteredOffers.map((item) => (
                  <tr key={item.id}>
                    <td style={{ width: "48px" }}>
                      <OfferIcon
                        icon={item.icon}
                        title={item.title}
                        className="offer-icon"
                      />
                    </td>
                    <td>
                      <strong style={{ display: "block", fontSize: "14px", color: "#ffffff" }}>
                        {item.title}
                      </strong>
                      <span className="muted" style={{ fontSize: "12px" }}>
                        {item.provider_name}
                      </span>
                      {item.featured && (
                        <span className="badge" style={{ marginLeft: "6px", fontSize: "10px", background: "rgba(234, 179, 8, 0.2)", color: "#fde047" }}>
                          ★ Featured
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge">{item.category}</span>
                    </td>
                    <td>
                      <strong style={{ color: "#fde047" }}>
                        {item.reward_points.toLocaleString()} pts
                      </strong>
                    </td>
                    <td>${Number(item.reward_usd ?? item.reward_points / 1000).toFixed(2)}</td>
                    <td style={{ fontSize: "12px" }}>
                      <div>
                        {item.countries.length === 0 ? "🌎 Worldwide" : `📍 ${item.countries.join(", ")}`}
                      </div>
                      <div className="muted" style={{ marginTop: "2px" }}>
                        {item.devices.join(", ")}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          item.status === "active" ? "status-paid" : "status-rejected"
                        }`}
                        style={{ textTransform: "capitalize" }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => openEditModal(item)}
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => handleToggleStatus(item)}
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                        >
                          {item.status === "active" ? "Pause" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => handleDelete(item)}
                          style={{ padding: "4px 8px", fontSize: "12px", color: "#f87171" }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                    No offers match the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Dialog for Add/Edit Offer */}
      {isModalOpen && (
        <div className="modal-backdrop withdrawal-modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="card withdrawal-modal" style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px" }}>
                {editingOffer ? "✏️ Edit Offer" : "➕ Add New Marketplace Offer"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {actionError && <div className="admin-action-error">{actionError}</div>}
            {actionSuccess && <div className="admin-action-success">{actionSuccess}</div>}

            <form onSubmit={handleFormSubmit} style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
                <label>
                  <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Offer Title *</span>
                  <input
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Complete Quick Survey"
                    required
                  />
                </label>

                <label>
                  <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Provider Name</span>
                  <input
                    className="input"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="e.g. Klink, Adswedmedia, Gemlads"
                    required
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                <label>
                  <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Category</span>
                  <select
                    className="input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="CPA">CPA</option>
                    <option value="Survey">Survey</option>
                    <option value="Apps">Apps</option>
                    <option value="Games">Games</option>
                    <option value="Signups">Signups</option>
                  </select>
                </label>

                <label>
                  <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Reward Points *</span>
                  <input
                    className="input"
                    type="number"
                    value={rewardPoints}
                    onChange={(e) => {
                      setRewardPoints(e.target.value);
                      setRewardUsd((Number(e.target.value) / 1000).toFixed(2));
                    }}
                    min="100"
                    step="50"
                    required
                  />
                </label>

                <label>
                  <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Reward USD ($)</span>
                  <input
                    className="input"
                    type="number"
                    value={rewardUsd}
                    onChange={(e) => setRewardUsd(e.target.value)}
                    step="0.01"
                    required
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "14px" }}>
                <label>
                  <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Icon / Emoji</span>
                  <input
                    className="input"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="🎁 or URL"
                  />
                </label>

                <label>
                  <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>
                    Provider Tracking URL * (Supports <code>{`{click_id}`}</code>, <code>{`{user_id}`}</code>)
                  </span>
                  <input
                    className="input"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://provider.com/click?sub1={click_id}"
                    required
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <label>
                  <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>
                    Target Countries (e.g. <code>ALL</code> or <code>BD, US, CA</code>)
                  </span>
                  <input
                    className="input"
                    value={countriesInput}
                    onChange={(e) => setCountriesInput(e.target.value)}
                    placeholder="ALL"
                  />
                </label>

                <label>
                  <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Status</span>
                  <select
                    className="input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="paused">Paused (Hidden)</option>
                  </select>
                </label>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "13px", marginBottom: "8px", color: "#e2e8f0" }}>Devices</span>
                <div style={{ display: "flex", gap: "16px" }}>
                  {["Desktop", "Mobile", "Tablet"].map((d) => (
                    <label key={d} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={devices.includes(d)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDevices([...devices, d]);
                          } else {
                            setDevices(devices.filter((x) => x !== d));
                          }
                        }}
                      />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label>
                <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Description</span>
                <textarea
                  className="input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Offer requirements and instructions for the user"
                />
              </label>

              <div style={{ display: "flex", gap: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                  />
                  <span>★ Featured offer</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={popular}
                    onChange={(e) => setPopular(e.target.checked)}
                  />
                  <span>🔥 Popular offer</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : editingOffer ? "Update Offer" : "Create Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
