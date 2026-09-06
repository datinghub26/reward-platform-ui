"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  addProviderCredential,
  toggleProviderCredential,
  deleteProviderCredential,
  testPostbackSimulation,
} from "./actions";

export type ProviderAuth = {
  id: string;
  provider_name: string;
  api_secret: string;
  enabled: boolean;
  created_at: string;
};

export default function PostbackHub({
  initialProviders,
  globalSecret,
  appUrl,
}: {
  initialProviders: ProviderAuth[];
  globalSecret: string;
  appUrl: string;
}) {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderAuth[]>(initialProviders);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        setIsLocalhost(true);
      }
    }
  }, []);

  const effectiveBaseUrl = isLocalhost
    ? (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
    : "https://www.rewardnova.shop";

  // New Provider Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [customSecret, setCustomSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Postback Simulator
  const [testClickId, setTestClickId] = useState("");
  const [testStatus, setTestStatus] = useState("approved");
  const [testProvider, setTestProvider] = useState("RewardNova Demo");
  const [testToken, setTestToken] = useState(globalSecret);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<unknown | null>(null);

  const canonicalUrl = `${effectiveBaseUrl}/api/postback?click_id={click_id}&status=1&token=${globalSecret}`;

  function copyPostbackUrl() {
    navigator.clipboard.writeText(canonicalUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  function toggleSecretVisibility(id: string) {
    setVisibleSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleAddProvider(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setModalError("");

    const res = await addProviderCredential(providerName, customSecret);
    if (!res.success || !res.provider) {
      setModalError(res.error || "Failed to add provider network.");
    } else {
      setProviders((prev) => [res.provider, ...prev]);
      setIsModalOpen(false);
      setProviderName("");
      setCustomSecret("");
      router.refresh();
    }
    setSubmitting(false);
  }

  async function handleToggle(p: ProviderAuth) {
    setProviders((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, enabled: !item.enabled } : item))
    );
    await toggleProviderCredential(p.id, p.enabled);
    router.refresh();
  }

  async function handleDelete(p: ProviderAuth) {
    if (!window.confirm(`Delete provider configuration for "${p.provider_name}"?`)) {
      return;
    }
    setProviders((prev) => prev.filter((item) => item.id !== p.id));
    await deleteProviderCredential(p.id);
    router.refresh();
  }

  async function handleSimulatePostback(e: React.FormEvent) {
    e.preventDefault();
    if (!testClickId.trim()) return;

    setSimulating(true);
    setSimResult(null);

    const result = await testPostbackSimulation({
      clickId: testClickId,
      status: testStatus,
      providerName: testProvider,
      token: testToken,
    });

    setSimResult(result);
    setSimulating(false);
  }

  return (
    <div style={{ display: "grid", gap: "28px" }}>
      {/* 1. Global Postback URL Card */}
      <section className="admin-card" style={{ marginTop: 0 }}>
        <div className="admin-card-header">
          <div>
            <h2>🌐 Global Postback Webhook URL</h2>
            <p>
              Provide this endpoint to affiliate offerwall networks (Klink, Adswedmedia, Gemlads, etc.).
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={copyPostbackUrl}
            style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}
          >
            <span>{copiedUrl ? "✓ Copied!" : "📋 Copy Webhook URL"}</span>
          </button>
        </div>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            borderRadius: "12px",
            padding: "16px 20px",
            fontFamily: "monospace",
            fontSize: "13px",
            color: "#86efac",
            wordBreak: "break-all",
            lineHeight: 1.5,
          }}
        >
          {canonicalUrl}
        </div>

        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            <strong style={{ color: "#ffffff", display: "block", marginBottom: "2px" }}>Accepted Click Macro:</strong>
            <code>click_id</code>, <code>subid</code>, <code>sub_id</code>, <code>sub1</code>
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            <strong style={{ color: "#ffffff", display: "block", marginBottom: "2px" }}>Accepted Status:</strong>
            <code>1</code>, <code>approved</code>, <code>0</code> (reversal), <code>pending</code>
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            <strong style={{ color: "#ffffff", display: "block", marginBottom: "2px" }}>Authentication:</strong>
            Header <code>x-postback-secret</code> or Query <code>?token=...</code>
          </div>
        </div>
      </section>

      {/* 2. Provider Networks Table */}
      <section className="admin-card" style={{ marginTop: 0 }}>
        <div className="admin-card-header">
          <div>
            <h2>Configured Provider Networks ({providers.length})</h2>
            <p>Authorized affiliate partner networks and postback API credentials.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setIsModalOpen(true);
              setModalError("");
            }}
            style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}
          >
            <span>➕</span> Add Network Credentials
          </button>
        </div>

        <div className="withdrawal-table-wrap">
          <table className="withdrawal-table">
            <thead>
              <tr>
                <th>Network Name</th>
                <th>API Secret Key</th>
                <th>Status</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => {
                const isVisible = Boolean(visibleSecrets[p.id]);
                return (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: "#ffffff" }}>{p.provider_name}</strong>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>
                          {isVisible
                            ? p.api_secret
                            : `${p.api_secret.substring(0, 8)}••••••••••••••••••••••••`}
                        </span>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => toggleSecretVisibility(p.id)}
                          style={{ padding: "2px 8px", fontSize: "11px" }}
                        >
                          {isVisible ? "Hide" : "Show"}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          p.enabled ? "status-paid" : "status-rejected"
                        }`}
                      >
                        {p.enabled ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: "12px" }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => handleToggle(p)}
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                        >
                          {p.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => handleDelete(p)}
                          style={{ padding: "4px 10px", fontSize: "12px", color: "#f87171" }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Live Postback Simulator & Debugger */}
      <section className="admin-card" style={{ marginTop: 0 }}>
        <div className="admin-card-header">
          <div>
            <h2>🧪 Live Postback Debugger & Simulator</h2>
            <p>
              Test conversion callbacks and balance crediting directly from this console.
            </p>
          </div>
        </div>

        <form onSubmit={handleSimulatePostback} style={{ display: "grid", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            <label>
              <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Click ID (UUID) *</span>
              <input
                className="input"
                value={testClickId}
                onChange={(e) => setTestClickId(e.target.value)}
                placeholder="Enter offer click ID"
                required
              />
            </label>

            <label>
              <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Status</span>
              <select
                className="input"
                value={testStatus}
                onChange={(e) => setTestStatus(e.target.value)}
              >
                <option value="approved">approved (Credits Reward)</option>
                <option value="pending">pending (0 Points)</option>
                <option value="reversed">reversed (Compensating Deduction)</option>
              </select>
            </label>

            <label>
              <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Provider Name</span>
              <input
                className="input"
                value={testProvider}
                onChange={(e) => setTestProvider(e.target.value)}
                placeholder="RewardNova Demo"
              />
            </label>

            <label>
              <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Token Secret</span>
              <input
                className="input"
                type="password"
                value={testToken}
                onChange={(e) => setTestToken(e.target.value)}
              />
            </label>
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={simulating || !testClickId.trim()}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {simulating ? "Executing Simulation…" : "🚀 Send Test Conversion"}
            </button>
          </div>

          {simResult != null && (
            <div
              style={{
                marginTop: "12px",
                background: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <strong style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#86efac" }}>
                Simulation Result:
              </strong>
              <pre style={{ margin: 0, fontSize: "12px", color: "#e2e8f0", overflowX: "auto" }}>
                {JSON.stringify(simResult, null, 2)}
              </pre>
            </div>
          )}
        </form>
      </section>

      {/* Modal: Add Provider */}
      {isModalOpen && (
        <div className="modal-backdrop withdrawal-modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="card withdrawal-modal" style={{ maxWidth: "520px", width: "100%", padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px" }}>➕ Add Affiliate Partner Network</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {modalError && <div className="admin-action-error">{modalError}</div>}

            <form onSubmit={handleAddProvider} style={{ display: "grid", gap: "16px" }}>
              <label>
                <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>Network Name *</span>
                <input
                  className="input"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="e.g. Klink, Adswedmedia, Gemlads"
                  required
                />
              </label>

              <label>
                <span style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#e2e8f0" }}>
                  Custom Secret (Leave empty to auto-generate)
                </span>
                <input
                  className="input"
                  value={customSecret}
                  onChange={(e) => setCustomSecret(e.target.value)}
                  placeholder="Optional 64-character secret key"
                />
              </label>

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
                  disabled={submitting || !providerName.trim()}
                >
                  {submitting ? "Saving…" : "Save Network"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
