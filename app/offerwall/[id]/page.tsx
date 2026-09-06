import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import { getStoredProviders, matchesProvider } from "@/lib/providers-store";
import { buildLaunchUrl } from "@/components/PartnerOfferwalls";

export const dynamic = "force-dynamic";

interface OfferwallPageProps {
  params: Promise<{ id: string }>;
}

export default async function OfferwallPage({ params }: OfferwallPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/offerwall/${encodeURIComponent(id)}`);
  }

  const providers = getStoredProviders();
  const provider = providers.find((p) => matchesProvider(p, id));

  if (!provider) {
    notFound();
  }

  // Strict Access Guard: If provider is turned OFF by admin, block everyone from accessing it
  if (!provider.active) {
    return (
      <div className="dashboard-shell">
        <AppSidebar active="earn" />
        <main className="dashboard-main">
          <div
            className="card admin-error"
            style={{
              maxWidth: "600px",
              margin: "60px auto",
              textAlign: "center",
              padding: "48px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div style={{ fontSize: "56px", lineHeight: 1 }}>🚫</div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", margin: 0 }}>
              Offer Wall Disabled
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              The <strong>{provider.name}</strong> offer wall is currently turned off by the platform administrator. Access to this partner network is strictly disabled for all members.
            </p>
            <div style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
              <Link href="/earn" className="btn btn-primary">
                ← Return to Earn Page
              </Link>
              <Link href="/dashboard" className="btn">
                Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const launchUrl = buildLaunchUrl(provider.url, user.id);

  return (
    <div className="dashboard-shell">
      <AppSidebar active="earn" />
      <main className="dashboard-main" style={{ display: "flex", flexDirection: "column", height: "100vh", padding: "20px" }}>
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            background: "var(--panel)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "12px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/earn" className="btn" style={{ padding: "6px 12px", fontSize: "12px" }}>
              ← Earn
            </Link>
            <span style={{ fontSize: "20px" }}>{provider.logo || "🌐"}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
                {provider.name} Offer Wall
              </h2>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                Verified tracking active · Rewards credit automatically
              </div>
            </div>
          </div>

          <a
            href={launchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ fontSize: "12px", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>Open Full Screen</span>
            <span>↗</span>
          </a>
        </div>

        {/* Offer wall iframe container */}
        <div
          style={{
            flex: 1,
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backgroundColor: "#0b1322",
            position: "relative",
          }}
        >
          <iframe
            src={launchUrl}
            title={`${provider.name} Offer Wall`}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="camera; microphone; geolocation"
          />
        </div>
      </main>
    </div>
  );
}
