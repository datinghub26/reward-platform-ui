import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import StartOfferButton from "@/components/StartOfferButton";
import OfferIcon from "@/components/OfferIcon";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getClientGeo, getCountryDisplayName, isOfferEligibleForCountry } from "@/lib/geo";
import { getOrAssignUserNumericIdAsync } from "@/lib/user-ids";

export default async function OfferDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [geo, { data: offer }, { data: profile }, numericId] = await Promise.all([
    getClientGeo(),
    supabase
      .from("offers")
      .select("id, icon, provider_name, title, description, category, offer_type, reward_points, reward_usd, countries, devices, terms, tracking_url")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("user_profiles")
      .select("country_code")
      .eq("id", user.id)
      .maybeSingle(),
    getOrAssignUserNumericIdAsync(user.id),
  ]);

  if (!offer) notFound();

  const verifiedCountry = geo.countryCode;

  // Persist verified IP country if missing or updated
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

  const isEligible = isOfferEligibleForCountry(offer.countries, verifiedCountry);

  const requirements = [
    "Available only where the offer's GEO and device rules are supported.",
    "Follow the provider's instructions exactly.",
    "Meet any new-user or eligibility requirements.",
    "Allow the provider time to verify the conversion before rewards are finalized.",
  ];

  return (
    <div className="dashboard-shell">
      <AppSidebar active="earn" />
      <main className="dashboard-main">
        <div className="offer-detail-page">
          <div className="container">
            <div className="detail-back"><Link href="/earn">← Back to Earn</Link></div>
            <div className="detail-layout">
              <section>
                <div className="detail-hero card">
                  <OfferIcon className="detail-icon" icon={offer.icon} title={offer.title} />
                  <div>
                    <span className="badge">{offer.offer_type}</span>
                    <div className="provider">{offer.provider_name}</div>
                  </div>
                  <h1>{offer.title}</h1>
                  <p>{offer.description || "Complete the qualifying activity according to the provider terms."}</p>

                  <div className="detail-reward">
                    <span>Your reward</span>
                    <strong>{Number(offer.reward_points).toLocaleString()} points</strong>
                    {offer.reward_usd != null && <small>≈ ${Number(offer.reward_usd).toFixed(2)}</small>}
                  </div>

                  <div className="offer-tags detail-tags">
                    {offer.countries.length === 0 ? (
                      <span>🌎 Worldwide</span>
                    ) : (
                      offer.countries.map((item: string) => (
                        <span key={`c-${item}`}>{getCountryDisplayName(item)}</span>
                      ))
                    )}
                    {offer.devices.map((item: string) => <span key={`d-${item}`}>📱 {item}</span>)}
                  </div>

                  {!isEligible && (
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#fca5a5",
                        marginTop: 14,
                        marginBottom: 14,
                        fontSize: "13px",
                      }}
                    >
                      ⚠️ <strong>Geo-Restriction Notice:</strong> This offer is only available in{" "}
                      <strong>{offer.countries.map((c: string) => getCountryDisplayName(c)).join(", ")}</strong>.
                      Your location is verified as <strong>{getCountryDisplayName(verifiedCountry)}</strong> based on your IP address.
                      Offers are strictly matched to your verified IP and cannot be changed.
                    </div>
                  )}

                  <StartOfferButton
                    offerId={offer.id}
                    trackingUrl={offer.tracking_url ?? ""}
                    countryCode={verifiedCountry}
                    source="offer_detail"
                    disabled={!offer.tracking_url || !isEligible}
                    buttonText={!isEligible ? "Not Available in Your Region" : "Start Offer →"}
                    userIdNumber={numericId}
                  />
                  {!offer.tracking_url && isEligible && (
                    <p className="detail-disclaimer">This offer is active in the database, but its provider tracking URL has not been configured yet.</p>
                  )}
                </div>

                <div className="detail-section card">
                  <h2>How it works</h2>
                  <div className="detail-steps">
                    <div><b>01</b><span>Start through RewardNova&apos;s tracked offer link.</span></div>
                    <div><b>02</b><span>Complete the requirements listed by the provider.</span></div>
                    <div><b>03</b><span>The provider sends a conversion/postback when the action qualifies.</span></div>
                    <div><b>04</b><span>Reward points are finalized through the conversion and ledger workflow.</span></div>
                  </div>
                </div>
              </section>

              <aside className="detail-sidebar">
                <div className="card">
                  <h3>Requirements</h3>
                  <ul className="requirements">{requirements.map((item) => <li key={item}>✓ {item}</li>)}</ul>
                </div>
                <div className="card">
                  <h3>Reward status</h3>
                  <div className="status-line"><span>Reward</span><strong>{Number(offer.reward_points).toLocaleString()} pts</strong></div>
                  <div className="status-line"><span>Verification</span><strong className="warning-text">Provider verification</strong></div>
                  <div className="status-line"><span>Tracking</span><strong className="success-text">Tracked click</strong></div>
                </div>
                <div className="card">
                  <h3>Before you start</h3>
                  {Array.isArray(offer.terms) && offer.terms.length > 0 ? (
                    <ul className="requirements">
                      {offer.terms.map((term: string) => <li key={term}>• {term}</li>)}
                    </ul>
                  ) : (
                    <p className="muted">Read the provider requirements carefully. Eligibility, tracking, conversion approval and reward timing are controlled by the applicable offer terms.</p>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
