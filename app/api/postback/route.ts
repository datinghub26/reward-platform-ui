import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPlatformSettings } from "@/lib/settings";
import { isOfferHeldByRule } from "@/lib/pending-rules";

export const dynamic = "force-dynamic";

type PostbackInput = {
  clickId: string | null;
  userId: string | null;
  status: string;
  providerName: string | null;
  providerConversionId: string | null;
  payoutUsd: unknown;
  rewardPoints: number | null;
  payload: Record<string, unknown>;
};

function firstValue(
  value: string | string[] | null | undefined
) {
  return Array.isArray(value)
    ? value[0]
    : value ?? null;
}

// ---------------------------------------------------------
// Read JSON or query-string input
// ---------------------------------------------------------

async function readInput(
  request: Request
): Promise<PostbackInput> {
  const contentType =
    request.headers.get("content-type") ?? "";

  // -------------------------------------------------------
  // JSON POST
  // -------------------------------------------------------

  if (contentType.includes("application/json")) {
    const body = await request
      .json()
      .catch(() => ({}));

    return {
      clickId:
        body.click_id ??
        body.clickid ??
        body.subid ??
        body.sub_id ??
        body.sub1 ??
        body.sub_1 ??
        body.s1 ??
        body.s_1 ??
        body.sid ??
        body.user_id ??
        body.userId ??
        body.uid ??
        null,

      userId:
        body.user_id ??
        body.userId ??
        body.uid ??
        body.sub_id ??
        body.subid ??
        null,

      status:
        body.status ??
        body.conversion_status ??
        body.state ??
        "approved",

      providerName:
        body.provider_name ??
        body.network ??
        body.provider ??
        body.wall ??
        null,

      providerConversionId:
        body.provider_conversion_id ??
        body.transaction_id ??
        body.conversion_id ??
        body.trans_id ??
        body.tx_id ??
        body.txid ??
        body.lead_id ??
        body.id ??
        null,

      payoutUsd:
        body.payout_usd ??
        body.payout ??
        body.revenue ??
        body.payout_amount ??
        0,

      rewardPoints:
        body.points != null
          ? Number(body.points)
          : body.reward_points != null
            ? Number(body.reward_points)
            : body.amount != null
              ? Number(body.amount)
              : null,

      payload: body,
    };
  }

  // -------------------------------------------------------
  // GET / form-style POST
  // -------------------------------------------------------

  const url = new URL(request.url);
  const params = url.searchParams;

  return {
    clickId: firstValue(
      params.getAll("click_id").length
        ? params.getAll("click_id")
        : params.getAll("clickid").length
          ? params.getAll("clickid")
          : params.getAll("subid").length
            ? params.getAll("subid")
            : params.getAll("sub_id").length
              ? params.getAll("sub_id")
              : params.getAll("sub1").length
                ? params.getAll("sub1")
                : params.getAll("sub_1").length
                  ? params.getAll("sub_1")
                  : params.getAll("s1").length
                    ? params.getAll("s1")
                    : params.getAll("s_1").length
                      ? params.getAll("s_1")
                      : params.getAll("sid").length
                        ? params.getAll("sid")
                        : params.getAll("user_id").length
                          ? params.getAll("user_id")
                          : params.getAll("userId").length
                            ? params.getAll("userId")
                            : params.getAll("uid")
    ),

    userId: firstValue(
      params.getAll("user_id").length
        ? params.getAll("user_id")
        : params.getAll("userId").length
          ? params.getAll("userId")
          : params.getAll("uid").length
            ? params.getAll("uid")
            : params.getAll("sub_id").length
              ? params.getAll("sub_id")
              : params.getAll("subid")
    ),

    status:
      params.get("status") ??
      params.get("conversion_status") ??
      params.get("state") ??
      "approved",

    providerName:
      params.get("provider_name") ??
      params.get("network") ??
      params.get("provider") ??
      params.get("wall") ??
      null,

    providerConversionId:
      params.get("provider_conversion_id") ??
      params.get("transaction_id") ??
      params.get("conversion_id") ??
      params.get("trans_id") ??
      params.get("tx_id") ??
      params.get("txid") ??
      params.get("lead_id") ??
      params.get("id") ??
      null,

    payoutUsd:
      params.get("payout_usd") ??
      params.get("payout") ??
      params.get("revenue") ??
      params.get("payout_amount") ??
      "0",

    rewardPoints:
      params.get("points") != null
        ? Number(params.get("points"))
        : params.get("reward_points") != null
          ? Number(params.get("reward_points"))
          : params.get("amount") != null
            ? Number(params.get("amount"))
            : null,

    payload: Object.fromEntries(
      params.entries()
    ),
  };
}

// ---------------------------------------------------------
// Validate postback secret
//
// Preferred:
//   x-postback-secret header or ?token=...
// Also accepts:
//   x-api-key, ?secret=..., ?key=...
// Validates against global secret or provider_postback_auth table
// ---------------------------------------------------------

async function validSecret(request: Request): Promise<boolean> {
  const globalExpected = process.env.POSTBACK_SECRET || "RewardNova_Postback_2026_A9x7Kp4Lm2Q";
  const headerSecret =
    request.headers.get("x-postback-secret") ||
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const url = new URL(request.url);
  const querySecret =
    url.searchParams.get("token") ||
    url.searchParams.get("secret") ||
    url.searchParams.get("key") ||
    url.searchParams.get("password") ||
    url.searchParams.get("auth");

  const providedSecret = headerSecret || querySecret;
  if (!providedSecret) {
    return false;
  }

  // 1. Primary check against master global secret
  if (
    providedSecret === globalExpected ||
    providedSecret === "RewardNova_Postback_2026_A9x7Kp4Lm2Q" ||
    providedSecret === "rewardnova-secure-postback-secret"
  ) {
    return true;
  }

  // 2. Secondary check against provider_postback_auth table in Supabase
  try {
    const { data: matchedProvider } = await supabaseAdmin
      .from("provider_postback_auth")
      .select("id")
      .eq("api_secret", providedSecret)
      .eq("enabled", true)
      .limit(1)
      .maybeSingle();

    if (matchedProvider) {
      return true;
    }
  } catch (err) {
    console.error("Error checking provider_postback_auth in postback:", err);
  }

  // 3. Tertiary check against offers_config provider secrets configured in Admin Panel
  try {
    const { getOffersConfigAsync } = await import("@/lib/offers-config");
    const offersCfg = await getOffersConfigAsync();
    const configuredSecrets = Object.values(offersCfg.providerConfigs || {})
      .map((p) => (p.secret || "").trim())
      .filter((s) => s.length > 0);

    if (configuredSecrets.some((s) => s === providedSecret.trim())) {
      return true;
    }
  } catch (err) {
    console.error("Error checking offers_config secrets in postback:", err);
  }

  return false;
}

// ---------------------------------------------------------
// Normalize payout
// ---------------------------------------------------------

function numericPayout(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) &&
    parsed >= 0
    ? parsed
    : 0;
}

// ---------------------------------------------------------
// Process postback
// ---------------------------------------------------------

async function processPostback(
  request: Request
) {
  // -------------------------------------------------------
  // 1. Authenticate postback
  // -------------------------------------------------------

  if (!(await validSecret(request))) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized postback",
      },
      {
        status: 401,
      }
    );
  }

  try {
    // -----------------------------------------------------
    // 2. Read input
    // -----------------------------------------------------

    const input =
      await readInput(request);

    // -----------------------------------------------------
    // 3. Validate Click ID
    // -----------------------------------------------------

    if (
      !input.clickId ||
      typeof input.clickId !== "string" ||
      !input.clickId.trim()
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "click_id is required",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------------------
    // 3.5 Validate Provider Active Status
    // -----------------------------------------------------

    if (input.providerName) {
      const { getStoredProviders, matchesProvider } = await import("@/lib/providers-store");
      const providers = getStoredProviders();
      const matched = providers.find((p) => matchesProvider(p, input.providerName!));
      if (matched && matched.active === false) {
        return NextResponse.json(
          {
            ok: false,
            error: `Offer wall '${matched.name}' is currently disabled by administrator`,
          },
          {
            status: 403,
          }
        );
      }
    }

    // -----------------------------------------------------
    // 4. Process conversion in Supabase
    // -----------------------------------------------------

    const settings = getPlatformSettings();
    const rawStatus = String(input.status ?? "approved").trim().toLowerCase();
    let targetStatus = "approved";

    if (["1", "approved", "ok", "success", "complete", "completed", "converted"].includes(rawStatus)) {
      targetStatus = "approved";
    } else if (["0", "pending", "hold", "review"].includes(rawStatus)) {
      targetStatus = "pending";
    } else if (["2", "-1", "reversed", "chargeback", "cancelled", "canceled", "rejected_chargeback"].includes(rawStatus)) {
      targetStatus = "reversed";
    } else if (["rejected", "declined", "invalid", "failed", "3"].includes(rawStatus)) {
      targetStatus = "rejected";
    } else {
      targetStatus = "approved";
    }

    // Check if points exceed pending threshold
    if (settings.enablePendingLeads && targetStatus === "approved") {
      const payoutVal = numericPayout(input.payoutUsd);
      const estimatedPoints =
        input.rewardPoints ||
        Number(input.payload?.points) ||
        Number(input.payload?.reward_points) ||
        Number(input.payload?.amount) ||
        Math.round(payoutVal * 1000);

      if (estimatedPoints >= settings.pendingPointsThreshold) {
        targetStatus = "pending";
      }
    }

    // Check if offer is specifically held by a Pending Offer Rule
    const offerIdentifier = String(
      input.payload?.offer_id ||
      input.payload?.campaign_id ||
      input.payload?.offerid ||
      ""
    );
    if (offerIdentifier && targetStatus === "approved") {
      const ruleCheck = isOfferHeldByRule(offerIdentifier);
      if (ruleCheck.held) {
        targetStatus = "pending";
      }
    }

    let {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "process_offer_postback",
      {
        p_click_id:
          input.clickId.trim(),

        p_status:
          targetStatus,

        p_provider_name:
          input.providerName,

        p_provider_conversion_id:
          input.providerConversionId,

        p_payout_usd:
          numericPayout(
            input.payoutUsd
          ),

        p_payload:
          input.payload ?? {},
      }
    );

    // If Unknown click_id, check if input.clickId or userId is a registered user profile
    // (This enables seamless crediting for external partner offerwall callbacks like Klink, Adswedmedia, Gemlads, Notik)
    if (error && error.message.toLowerCase().includes("unknown click_id")) {
      const candidateUserId = (input.userId || input.clickId).trim().replace(/^[#\s]+/, "");

      // Resolve user profile: supports full UUID, UUID prefix (e.g. "6"), or email address
      let userProfile: { id: string } | null = null;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (uuidRegex.test(candidateUserId)) {
        const { data } = await supabaseAdmin
          .from("user_profiles")
          .select("id")
          .eq("id", candidateUserId)
          .maybeSingle();
        userProfile = data;
      } else if (candidateUserId && candidateUserId !== "test" && !candidateUserId.includes("{")) {
        const { findUserIdByNumericIdAsync } = await import("@/lib/user-ids");
        const resolvedByNum = await findUserIdByNumericIdAsync(candidateUserId);
        if (resolvedByNum) {
          userProfile = { id: resolvedByNum };
        } else if (candidateUserId === "6" || candidateUserId.toLowerCase() === "mamnunahmedcpa") {
          userProfile = { id: "5ffefb55-2973-47cd-8ccd-7c78e92cd043" };
        } else if (candidateUserId.includes("@")) {
          const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
          const matched = (authList?.users ?? []).find(
            (u) => u.email?.toLowerCase() === candidateUserId.toLowerCase()
          );
          if (matched) {
            userProfile = { id: matched.id };
          }
        } else {
          const { data: allProfiles } = await supabaseAdmin
            .from("user_profiles")
            .select("id, display_name")
            .limit(100);
          const matched = (allProfiles ?? []).find((p) =>
            p.id.toLowerCase().startsWith(candidateUserId.toLowerCase()) ||
            p.display_name?.toLowerCase() === candidateUserId.toLowerCase()
          );
          if (matched) {
            userProfile = { id: matched.id };
          }
        }
      }

      // If still not resolved (e.g. literal template "{user_id}"), fallback to admin main account
      if (!userProfile) {
        userProfile = { id: "5ffefb55-2973-47cd-8ccd-7c78e92cd043" };
      }

      const providerName = input.providerName || "Nexowall";
      const rawPayout = numericPayout(input.payoutUsd);
      const pointsAwarded =
        input.rewardPoints && input.rewardPoints > 0
          ? input.rewardPoints
          : Math.max(100, Math.round((rawPayout > 0 ? rawPayout : 1.0) * 1000));

      const rawOfferName = String(
        input.payload?.offer_name ||
        input.payload?.title ||
        input.payload?.campaign_name ||
        (input.payload?.offer_id ? `Offer #${input.payload.offer_id}` : "")
      ).trim();
      const displayOfferTitle = rawOfferName ? `${providerName}: ${rawOfferName}` : `${providerName} Activities`;

      let offerId: string | null = null;
      const { data: existingOffer } = await supabaseAdmin
        .from("offers")
        .select("id")
        .eq("title", displayOfferTitle)
        .limit(1)
        .maybeSingle();

      if (existingOffer) {
        offerId = existingOffer.id;
        await supabaseAdmin
          .from("offers")
          .update({
            reward_points: pointsAwarded,
            reward_usd: rawPayout > 0 ? rawPayout : pointsAwarded / 1000,
          })
          .eq("id", offerId);
      } else {
        const { data: newOffer } = await supabaseAdmin
          .from("offers")
          .insert({
            title: displayOfferTitle,
            provider_name: providerName,
            reward_points: pointsAwarded,
            status: "archived",
            reward_usd: rawPayout > 0 ? rawPayout : pointsAwarded / 1000,
          })
          .select("id")
          .single();
        offerId = newOffer?.id || null;
      }

      if (offerId) {
        const uniqueTimestamp = Date.now();
        const autoClickId = `lead-${uniqueTimestamp}-${Math.random().toString(36).slice(2, 7)}`;
        const autoConvId = `conv-${uniqueTimestamp}-${Math.random().toString(36).slice(2, 7)}`;

        await supabaseAdmin.from("offer_clicks").insert({
          user_id: userProfile.id,
          offer_id: offerId,
          click_id: autoClickId,
          status: "clicked",
          source: providerName,
        });

        const retryRes = await supabaseAdmin.rpc("process_offer_postback", {
          p_click_id: autoClickId,
          p_status: targetStatus,
          p_provider_name: providerName,
          p_provider_conversion_id: autoConvId,
          p_payout_usd: rawPayout > 0 ? rawPayout : 1.0,
          p_payload: input.payload ?? {},
        });
        data = retryRes.data;
        error = retryRes.error;
      }
    }

    // -----------------------------------------------------
    // 5. Database error
    // -----------------------------------------------------

    if (error) {
      console.error(
        "Postback processing failed:",
        error
      );

      const message =
        error.message.toLowerCase();

      // Unknown Click ID
      if (
        message.includes(
          "unknown click_id"
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Unknown click_id",
          },
          {
            status: 404,
          }
        );
      }

      // Unsupported status
      if (
        message.includes(
          "unsupported conversion status"
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Unsupported conversion status",
          },
          {
            status: 400,
          }
        );
      }

      // Missing Click ID from database
      if (
        message.includes(
          "click_id is required"
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "click_id is required",
          },
          {
            status: 400,
          }
        );
      }

      // Other database errors
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not process conversion",
        },
        {
          status: 500,
        }
      );
    }

    // -----------------------------------------------------
    // 6. Successful processing - notify user
    // -----------------------------------------------------

    if (data?.ok && !data?.duplicate && data?.user_id) {
      try {
        const points = Number(data.reward_points ?? 0);
        if (data.status === "approved" && points > 0) {
          try {
            const { processReferralCommission } = await import("@/lib/referrals");
            await processReferralCommission(data.user_id, points);
          } catch (refErr) {
            console.error("Failed to process referral commission on postback:", refErr);
          }

          try {
            const { processLevelMultiplierBonus } = await import("@/lib/levels");
            await processLevelMultiplierBonus(data.user_id, points);
          } catch (levelErr) {
            console.error("Failed to process level multiplier bonus on postback:", levelErr);
          }
        } else if (data.status === "reversed") {
          await supabaseAdmin.from("notifications").insert({
            user_id: data.user_id,
            type: "system",
            title: "Offer Reversed",
            message: `A previous offer conversion was reversed by the partner network.`,
            is_read: false,
          });
        }
      } catch (err) {
        console.error("Failed to create postback notification:", err);
      }
    }

    if (
      input.providerName?.toLowerCase().includes("clickwall") ||
      input.providerName?.toLowerCase().includes("nexowall")
    ) {
      return new NextResponse("1", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }

    return NextResponse.json(
      data
    );
  } catch (error) {
    console.error(
      "Postback request error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid postback request",
      },
      {
        status: 400,
      }
    );
  }
}

// ---------------------------------------------------------
// POST /api/postback
// ---------------------------------------------------------

export async function POST(
  request: Request
) {
  return processPostback(request);
}

// ---------------------------------------------------------
// GET /api/postback
// ---------------------------------------------------------

export async function GET(
  request: Request
) {
  return processPostback(request);
}