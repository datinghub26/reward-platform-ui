import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import OfferWall from "@/components/OfferWall";
import PartnerOfferwalls from "@/components/PartnerOfferwalls";
import { getStoredProviders } from "@/lib/providers-store";
import { getOffersConfig } from "@/lib/offers-config";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getClientGeo } from "@/lib/geo";

export const dynamic = "force-dynamic";

export default async function EarnPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [geo, { data: profile }, { data: offers, error }] = await Promise.all([
    getClientGeo(),
    supabase
      .from("user_profiles")
      .select("available_points, country_code")
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("offers")
      .select(
        "id, icon, provider_name, title, description, category, offer_type, reward_points, reward_usd, countries, devices, featured, popular, priority, tracking_url"
      )
      .eq("status", "active")
      .order("priority", { ascending: false })
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (error) {
    console.error("Earn offer query failed:", error);
  }

  const verifiedCountry = geo.countryCode;

  // Persist verified IP country to user profile if missing or updated
  if (profile && profile.country_code !== verifiedCountry) {
    try {
      await supabaseAdmin
        .from("user_profiles")
        .update({ country_code: verifiedCountry })
        .eq("id", user.id);
    } catch (e) {
      console.error("Error auto-syncing profile country from IP:", e);
    }
  }

  // Fetch current synchronized providers directly from store
  const storedProviders = getStoredProviders();
  const offersConfig = getOffersConfig();

  return (
    <div className="dashboard-shell">
      <AppSidebar active="earn" />

      <main className="dashboard-main">
        <OfferWall
          offers={offers ?? []}
          availablePoints={Number(profile?.available_points ?? 0)}
          profileCountry={verifiedCountry}
          offersConfig={offersConfig}
          partnerOfferwallsSlot={
            <PartnerOfferwalls
              providers={storedProviders}
              userId={user.id}
            />
          }
        />
      </main>
    </div>
  );
}
