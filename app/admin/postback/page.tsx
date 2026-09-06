import { supabaseAdmin } from "@/lib/supabase/admin";
import PostbackHub, { ProviderAuth } from "./PostbackHub";
import { headers } from "next/headers";
import { getAppUrl } from "@/lib/url-helper";

export const dynamic = "force-dynamic";

export default async function AdminPostbackPage() {
  const [headersList, { data: rawProviders, error: providersError }] = await Promise.all([
    headers(),
    supabaseAdmin
      .from("provider_postback_auth")
      .select("id, provider_name, api_secret, enabled, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (providersError) {
    return (
      <div className="card admin-error" style={{ padding: "24px" }}>
        <div className="admin-error-icon">⚠️</div>
        <h1>Unable to load provider credentials</h1>
        <p>Could not fetch postback authentication settings.</p>
        <pre>{providersError.message}</pre>
      </div>
    );
  }

  const providers: ProviderAuth[] = (rawProviders ?? []).map((p) => ({
    id: p.id,
    provider_name: p.provider_name ?? "Unknown Network",
    api_secret: p.api_secret ?? "",
    enabled: Boolean(p.enabled),
    created_at: p.created_at,
  }));

  const globalSecret = process.env.POSTBACK_SECRET || "RewardNova_Postback_2026_A9x7Kp4Lm2Q";
  const appUrl = getAppUrl(headersList);

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Postback & Partner Networks</h1>
      </div>
      <PostbackHub
        initialProviders={providers}
        globalSecret={globalSecret}
        appUrl={appUrl}
      />
    </div>
  );
}
