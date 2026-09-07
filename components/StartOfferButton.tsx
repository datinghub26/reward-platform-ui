"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type StartOfferButtonProps = {
  offerId: string;
  trackingUrl: string;
  countryCode?: string | null;
  source: string;
  disabled?: boolean;
  buttonClassName?: string;
  buttonText?: string;
  userIdNumber?: string | number;
};

type OfferClick = {
  click_id: string;
  user_id: string;
};

function getDeviceType() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/ipad|tablet/.test(userAgent)) return "tablet";
  if (/android|iphone|ipod|mobile/.test(userAgent)) return "mobile";

  return "desktop";
}

function resolveTrackingUrl(
  template: string,
  click: OfferClick,
  offerId: string,
  numericUserId?: string | number
) {
  const userIdVal = String(numericUserId || click.user_id);
  let url = template
    .replaceAll("{click_id}", encodeURIComponent(click.click_id))
    .replaceAll("%7Bclick_id%7D", encodeURIComponent(click.click_id))
    .replaceAll("%7BCLICK_ID%7D", encodeURIComponent(click.click_id))
    .replaceAll("{CLICK_ID}", encodeURIComponent(click.click_id))
    .replaceAll("{user_id}", encodeURIComponent(userIdVal))
    .replaceAll("%7Buser_id%7D", encodeURIComponent(userIdVal))
    .replaceAll("%7BUSER_ID%7D", encodeURIComponent(userIdVal))
    .replaceAll("{USER_ID}", encodeURIComponent(userIdVal))
    .replaceAll("{offer_id}", encodeURIComponent(offerId))
    .replaceAll("%7Boffer_id%7D", encodeURIComponent(offerId));

  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("The provider tracking URL is invalid.");
  }

  // Ensure click_id is present even if the tracking URL had no {click_id} macro
  const hasClickMacro =
    template.includes("{click_id}") ||
    template.includes("%7Bclick_id%7D") ||
    parsedUrl.searchParams.has("sub2") ||
    parsedUrl.searchParams.has("subId") ||
    parsedUrl.searchParams.has("click_id");

  if (!hasClickMacro && !parsedUrl.searchParams.has("click_id")) {
    parsedUrl.searchParams.set("click_id", click.click_id);
  }

  return parsedUrl.toString();
}

export default function StartOfferButton({
  offerId,
  trackingUrl,
  countryCode,
  source,
  disabled,
  buttonClassName = "btn btn-primary btn-large detail-start",
  buttonText = "Start Offer →",
  userIdNumber,
}: StartOfferButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startOffer() {
    if (disabled || loading) return;

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("create_offer_click", {
        p_offer_id: offerId,
        p_source: source,
        p_sub_id: null,
        p_country_code: countryCode?.trim().toUpperCase() || null,
        p_device_type: getDeviceType(),
        p_user_agent: navigator.userAgent,
      });

      if (rpcError) throw new Error(rpcError.message);

      const click = data as OfferClick | null;

      if (!click?.click_id || !click.user_id) {
        throw new Error("The offer click could not be created.");
      }

      window.location.assign(resolveTrackingUrl(trackingUrl, click, offerId, userIdNumber));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start this offer.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className={buttonClassName}
        type="button"
        onClick={startOffer}
        disabled={disabled || loading}
      >
        {loading ? "Starting…" : disabled ? "Tracking not configured" : buttonText}
      </button>
      {error && <p className="detail-disclaimer error-text">{error}</p>}
    </>
  );
}
