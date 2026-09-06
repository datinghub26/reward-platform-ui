import { supabaseAdmin } from "@/lib/supabase/admin";
import OfferManager, { AdminOffer } from "./OfferManager";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  const { data: rawOffers, error: offersError } = await supabaseAdmin
    .from("offers")
    .select(
      `
        id,
        provider_name,
        title,
        description,
        category,
        offer_type,
        icon,
        reward_points,
        reward_usd,
        countries,
        devices,
        tracking_url,
        status,
        featured,
        popular,
        created_at
      `
    )
    .order("created_at", { ascending: false });

  if (offersError) {
    return (
      <div className="card admin-error" style={{ padding: "24px" }}>
        <div className="admin-error-icon">⚠️</div>
        <h1>Unable to load offers</h1>
        <p>Could not fetch offer records from the database.</p>
        <pre>{offersError.message}</pre>
      </div>
    );
  }

  const offers: AdminOffer[] = (rawOffers ?? []).map((o) => ({
    id: o.id,
    provider_name: o.provider_name ?? "RewardNova",
    title: o.title ?? "Untitled Offer",
    description: o.description ?? null,
    category: o.category ?? "CPA",
    offer_type: o.offer_type ?? o.category ?? "CPA",
    icon: o.icon ?? "🎁",
    reward_points: Number(o.reward_points ?? 0),
    reward_usd: o.reward_usd != null ? Number(o.reward_usd) : null,
    countries: Array.isArray(o.countries) ? o.countries : [],
    devices: Array.isArray(o.devices) ? o.devices : ["Desktop", "Mobile"],
    tracking_url: o.tracking_url ?? "",
    status: o.status ?? "active",
    featured: Boolean(o.featured),
    popular: Boolean(o.popular),
    created_at: o.created_at,
  }));

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Offers</h1>
      </div>
      <OfferManager initialOffers={offers} />
    </div>
  );
}
