import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPlatformSettings } from "@/lib/settings";
import { isOfferHeldByRule } from "@/lib/pending-rules";

export const dynamic = "force-dynamic";

type PostbackInput = {
  clickId: string | null;
  status: string;
  providerName: string | null;
  providerConversionId: string | null;
  payoutUsd: unknown;
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
        null,

      status:
        body.status ??
        body.conversion_status ??
        "approved",

      providerName:
        body.provider_name ??
        body.network ??
        null,

      providerConversionId:
        body.provider_conversion_id ??
        body.transaction_id ??
        body.conversion_id ??
        body.trans_id ??
        body.tx_id ??
        body.txid ??
        body.lead_id ??
        null,

      payoutUsd:
        body.payout_usd ??
        body.payout ??
        body.revenue ??
        0,

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
                : params.getAll("sub_1")
      ),

    status:
      params.get("status") ??
      params.get("conversion_status") ??
      "approved",

    providerName:
      params.get("provider_name") ??
      params.get("network") ??
      null,

    providerConversionId:
      params.get("provider_conversion_id") ??
      params.get("transaction_id") ??
      params.get("conversion_id") ??
      params.get("trans_id") ??
      params.get("tx_id") ??
      params.get("txid") ??
      params.get("lead_id") ??
      null,

    payoutUsd:
      params.get("payout_usd") ??
      params.get("payout") ??
      params.get("revenue") ??
      "0",

    payload: Object.fromEntries(
      params.entries()
    ),
  };
}

// ---------------------------------------------------------
// Validate postback secret
//
// Preferred:
//   x-postback-secret header
//
// Compatibility:
//   ?token=...
// ---------------------------------------------------------

function validSecret(request: Request) {
  const expected =
    process.env.POSTBACK_SECRET;

  if (!expected) {
    console.error(
      "POSTBACK_SECRET is not configured."
    );

    return false;
  }

  const headerSecret =
    request.headers.get(
      "x-postback-secret"
    );

  if (
    headerSecret &&
    headerSecret === expected
  ) {
    return true;
  }

  const url = new URL(request.url);

  const querySecret =
    url.searchParams.get("token");

  if (
    querySecret &&
    querySecret === expected
  ) {
    return true;
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

  if (!validSecret(request)) {
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
    let targetStatus = String(input.status ?? "approved").toLowerCase();

    // Check if points exceed pending threshold
    if (settings.enablePendingLeads) {
      const payoutVal = numericPayout(input.payoutUsd);
      const estimatedPoints =
        Number(input.payload?.points) ||
        Number(input.payload?.reward_points) ||
        Number(input.payload?.amount) ||
        Math.round(payoutVal * 1000);

      if (
        estimatedPoints >= settings.pendingPointsThreshold &&
        (targetStatus === "approved" || targetStatus === "1" || targetStatus === "success")
      ) {
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
    if (offerIdentifier) {
      const ruleCheck = isOfferHeldByRule(offerIdentifier);
      if (
        ruleCheck.held &&
        (targetStatus === "approved" || targetStatus === "1" || targetStatus === "success")
      ) {
        targetStatus = "pending";
      }
    }

    const {
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
          await supabaseAdmin.from("notifications").insert({
            user_id: data.user_id,
            type: "reward",
            title: "Reward Credited! 🎉",
            message: `You earned ${points.toLocaleString()} points from a completed offer.`,
            is_read: false,
          });

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