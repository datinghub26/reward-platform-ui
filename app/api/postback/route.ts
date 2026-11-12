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
  rewardedTxnId: string | null;
  payoutUsd: unknown;
  rewardPoints: number | null;
  payload: Record<string, unknown>;
};

function isEmptyOrPlaceholder(
  value: unknown
): boolean {
  if (value == null) return true;
  const trimmed = String(value).trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return true;
  }
  return false;
}

function pickParam(
  params: URLSearchParams,
  keys: string[]
): string | null {
  for (const key of keys) {
    for (const raw of params.getAll(key)) {
      if (!isEmptyOrPlaceholder(raw)) {
        return raw.trim();
      }
    }
  }
  return null;
}

function pickNumberParam(
  params: URLSearchParams,
  keys: string[]
): number | null {
  for (const key of keys) {
    for (const raw of params.getAll(key)) {
      if (isEmptyOrPlaceholder(raw)) continue;
      const parsed = Number(raw.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function pickBodyString(
  body: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const val = body[key];
    if (!isEmptyOrPlaceholder(val)) {
      return String(val).trim();
    }
  }
  return null;
}

function pickBodyNumber(
  body: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const val = body[key];
    if (isEmptyOrPlaceholder(val)) continue;
    const parsed = Number(String(val).trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

async function readCombinedParams(
  request: Request
): Promise<URLSearchParams> {
  const url = new URL(request.url);
  const combined = new URLSearchParams(url.searchParams);
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.clone().text();
      for (const [k, v] of new URLSearchParams(text).entries()) {
        combined.append(k, v);
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.clone().formData();
      for (const [k, v] of formData.entries()) {
        if (typeof v === "string") {
          combined.append(k, v);
        }
      }
    } else if (
      request.method !== "GET" &&
      request.method !== "HEAD" &&
      !contentType.includes("application/json")
    ) {
      const text = (await request.clone().text()).trim();
      if (text && text.includes("=")) {
        for (const [k, v] of new URLSearchParams(text).entries()) {
          combined.append(k, v);
        }
      }
    }
  } catch {
    // Ignore body parse errors and keep query string params
  }

  return combined;
}

// ---------------------------------------------------------
// Read JSON or query/form input
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
    const body = (await request
      .json()
      .catch(() => ({}))) as Record<string, unknown>;

    const bodyWall = pickBodyString(body, [
      "provider_name",
      "network",
      "provider",
      "wall",
    ]);

    return {
      clickId: pickBodyString(body, [
        "click_id",
        "clickid",
        "subid",
        "sub_id",
        "subId",
        "sub1",
        "sub_1",
        "s1",
        "s_1",
        "sid",
        "user_id",
        "userId",
        "uid",
      ]),

      userId: pickBodyString(body, [
        "user_id",
        "userId",
        "userid",
        "uid",
        "sub_id",
        "subid",
        "subId",
        "sub",
        "user",
      ]),

      status:
        pickBodyString(body, [
          "status",
          "conversion_status",
          "state",
        ]) ?? "approved",

      providerName:
        bodyWall ??
        (body.placementId === "6a9e310ea777a90b91c94cec" ||
        body.placement_id === "6a9e310ea777a90b91c94cec"
          ? "Gemiads"
          : body.app_id === "CFGU6xt4mO" ||
              (!isEmptyOrPlaceholder(body.pub_id) &&
                !isEmptyOrPlaceholder(body.app_id) &&
                !isEmptyOrPlaceholder(body.txn_id))
            ? "Notik"
            : !isEmptyOrPlaceholder(body.signature) &&
                !isEmptyOrPlaceholder(body.transId) &&
                (!isEmptyOrPlaceholder(body.reward_name) ||
                  !isEmptyOrPlaceholder(body.reward_value) ||
                  !isEmptyOrPlaceholder(body.offer_type))
              ? "Offery"
              : new URL(request.url).pathname.toLowerCase().includes("offery")
                ? "Offery"
                : null),

      providerConversionId: pickBodyString(body, [
        "provider_conversion_id",
        "transaction_id",
        "transactionId",
        "conversion_id",
        "conversionId",
        "trans_id",
        "transId",
        "transid",
        "txn_id",
        "txnid",
        "tx_id",
        "txid",
        "lead_id",
        "track_id",
        "tracking_id",
        "id",
      ]),

      rewardedTxnId: pickBodyString(body, [
        "rewarded_txn_id",
        "rewardedTxnId",
        "original_txn_id",
        "orig_txn_id",
      ]),

      payoutUsd:
        pickBodyString(body, [
          "payout_usd",
          "payout",
          "revenue",
          "payout_amount",
        ]) ?? 0,

      rewardPoints: pickBodyNumber(body, [
        "points",
        "reward_points",
        "reward",
        "amount",
        "credits",
        "virtual_currency",
      ]),

      payload: body,
    };
  }

  // -------------------------------------------------------
  // GET / form-style POST
  // -------------------------------------------------------

  const url = new URL(request.url);
  const params = await readCombinedParams(request);

  const pathStr = url.pathname.toLowerCase();
  const reqMatchedPath = (request.headers.get("x-matched-path") || "").toLowerCase();
  const reqInvokePath = (request.headers.get("x-invoke-path") || "").toLowerCase();
  const wallHint = (
    pickParam(params, ["provider_name", "network", "provider", "wall"]) || ""
  ).toLowerCase();

  const isOffery =
    pathStr.includes("offery") ||
    reqMatchedPath.includes("offery") ||
    reqInvokePath.includes("offery") ||
    wallHint.includes("offery") ||
    (pickParam(params, ["signature"]) !== null &&
      pickParam(params, ["transId"]) !== null &&
      (pickParam(params, ["reward_name", "reward_value", "offer_type"]) !== null ||
        pickParam(params, ["subId"]) !== null));

  const isGemiads =
    pathStr.includes("gemiad") ||
    pathStr.includes("gemlad") ||
    pathStr.includes("gemiwall") ||
    reqMatchedPath.includes("gemiad") ||
    reqInvokePath.includes("gemiad") ||
    wallHint.includes("gemiad") ||
    wallHint.includes("gemlad") ||
    pickParam(params, ["placementId", "placement_id"]) === "6a9e310ea777a90b91c94cec";

  const isNexo =
    pathStr.includes("nexowall") ||
    reqMatchedPath.includes("nexowall") ||
    reqInvokePath.includes("nexowall") ||
    wallHint.includes("nexowall");

  const isAdsweb =
    pathStr.includes("adswedmedia") ||
    pathStr.includes("adswebmedia") ||
    reqMatchedPath.includes("adswedmedia") ||
    reqInvokePath.includes("adswedmedia") ||
    wallHint.includes("adswedmedia") ||
    wallHint.includes("adswebmedia");

  const isNotik =
    pathStr.includes("notik") ||
    reqMatchedPath.includes("notik") ||
    reqInvokePath.includes("notik") ||
    wallHint.includes("notik") ||
    pickParam(params, ["app_id"]) === "CFGU6xt4mO" ||
    (pickParam(params, ["pub_id"]) !== null &&
      pickParam(params, ["app_id"]) !== null &&
      pickParam(params, ["txn_id"]) !== null);

  const isExplicitClickwall =
    pathStr.includes("clickwall") ||
    reqMatchedPath.includes("clickwall") ||
    reqInvokePath.includes("clickwall") ||
    wallHint.includes("clickwall");

  const isUpwall =
    pathStr.includes("upwall") ||
    reqMatchedPath.includes("upwall") ||
    reqInvokePath.includes("upwall") ||
    wallHint.includes("upwall");

  const isTxidClickwallFallback =
    !isOffery &&
    !isGemiads &&
    !isNexo &&
    !isAdsweb &&
    !isNotik &&
    !isUpwall &&
    pickParam(params, ["txid"]) !== null;

  const payloadObj: Record<string, string> = {};
  for (const [key, val] of params.entries()) {
    if (!isEmptyOrPlaceholder(val) || !(key in payloadObj)) {
      payloadObj[key] = val;
    }
  }

  return {
    clickId: pickParam(params, [
      "click_id",
      "clickid",
      "subid",
      "sub_id",
      "subId",
      "sub1",
      "sub_1",
      "s1",
      "s_1",
      "sid",
      "user_id",
      "userId",
      "userid",
      "uid",
      "user",
      "txid",
      "tx_id",
      "trans_id",
      "txn_id",
    ]),

    userId: pickParam(params, [
      "user_id",
      "userId",
      "userid",
      "uid",
      "sub_id",
      "subid",
      "subId",
      "sub",
      "user",
    ]),

    status:
      pickParam(params, ["status", "conversion_status", "state"]) ?? "approved",

    providerName:
      pickParam(params, ["provider_name", "network", "provider", "wall"]) ??
      (isOffery
        ? "Offery"
        : isGemiads
          ? "Gemiads"
          : isNexo
            ? "Nexowall"
            : isAdsweb
              ? "Adswedmedia"
              : isNotik
                ? "Notik"
                : isExplicitClickwall || isTxidClickwallFallback
                  ? "Clickwall"
                  : isUpwall
                    ? "Upwall"
                    : null),

    providerConversionId: pickParam(params, [
      "provider_conversion_id",
      "transaction_id",
      "transactionId",
      "conversion_id",
      "conversionId",
      "trans_id",
      "transId",
      "transid",
      "txn_id",
      "txnid",
      "tx_id",
      "txid",
      "lead_id",
      "track_id",
      "tracking_id",
      "id",
    ]),

    rewardedTxnId: pickParam(params, [
      "rewarded_txn_id",
      "rewardedTxnId",
      "original_txn_id",
      "orig_txn_id",
    ]),

    payoutUsd:
      pickParam(params, ["payout_usd", "payout", "revenue", "payout_amount"]) ??
      "0",

    rewardPoints: pickNumberParam(params, [
      "points",
      "reward_points",
      "reward",
      "amount",
      "credits",
      "virtual_currency",
    ]),

    payload: payloadObj,
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
  const combinedParams = await readCombinedParams(request);
  const querySecret =
    combinedParams.get("token") ||
    combinedParams.get("secret") ||
    combinedParams.get("key") ||
    combinedParams.get("password") ||
    combinedParams.get("auth");

  const providedSecret = headerSecret || querySecret;

  // Dedicated offerwall webhook paths (e.g. Clickwall / Nexowall / Gemiads / Adswebmedia / Upwall / Notik / Offery)
  const pathname = url.pathname.toLowerCase();
  const matchedPath = (request.headers.get("x-matched-path") || "").toLowerCase();
  const invokePath = (request.headers.get("x-invoke-path") || "").toLowerCase();
  const queryWall = (
    pickParam(combinedParams, ["wall", "network", "provider"]) || ""
  ).toLowerCase();
  const placementId = pickParam(combinedParams, ["placementId", "placement_id"]) || "";

  const isNotikRequest =
    pathname.includes("notik") ||
    matchedPath.includes("notik") ||
    invokePath.includes("notik") ||
    queryWall.includes("notik") ||
    pickParam(combinedParams, ["app_id"]) === "CFGU6xt4mO" ||
    (pickParam(combinedParams, ["pub_id"]) !== null &&
      pickParam(combinedParams, ["app_id"]) !== null &&
      pickParam(combinedParams, ["txn_id"]) !== null);

  const isOfferyRequest =
    pathname.includes("offery") ||
    matchedPath.includes("offery") ||
    invokePath.includes("offery") ||
    queryWall.includes("offery") ||
    (pickParam(combinedParams, ["signature"]) !== null &&
      pickParam(combinedParams, ["transId"]) !== null &&
      (pickParam(combinedParams, ["reward_name", "reward_value", "offer_type"]) !== null ||
        pickParam(combinedParams, ["subId"]) !== null));

  const isDedicatedOfferwallRoute =
    pathname.includes("clickwall") ||
    matchedPath.includes("clickwall") ||
    invokePath.includes("clickwall") ||
    queryWall.includes("clickwall") ||
    pathname.includes("gemiad") ||
    pathname.includes("gemlad") ||
    pathname.includes("gemiwall") ||
    matchedPath.includes("gemiad") ||
    invokePath.includes("gemiad") ||
    queryWall.includes("gemiad") ||
    queryWall.includes("gemlad") ||
    placementId === "6a9e310ea777a90b91c94cec" ||
    pathname.includes("nexowall") ||
    matchedPath.includes("nexowall") ||
    invokePath.includes("nexowall") ||
    queryWall.includes("nexowall") ||
    pathname.includes("adswedmedia") ||
    pathname.includes("adswebmedia") ||
    matchedPath.includes("adswedmedia") ||
    invokePath.includes("adswedmedia") ||
    queryWall.includes("adswedmedia") ||
    queryWall.includes("adswebmedia") ||
    pathname.includes("upwall") ||
    matchedPath.includes("upwall") ||
    invokePath.includes("upwall") ||
    queryWall.includes("upwall") ||
    isNotikRequest ||
    isOfferyRequest;

  const hasConversionIdentifiers =
    Boolean(
      pickParam(combinedParams, [
        "sub_id",
        "user_id",
        "userId",
        "userid",
        "subId",
        "sub",
        "uid",
        "click_id",
        "clickid",
      ])
    ) &&
    Boolean(
      pickParam(combinedParams, [
        "trans_id",
        "transId",
        "txn_id",
        "txnid",
        "txid",
        "tx_id",
        "transaction_id",
        "transactionId",
        "conversion_id",
        "conversionId",
        "lead_id",
      ])
    );

  const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "";
  const isGemiadServerIp = clientIp.includes("64.226.92.208");

  if (isDedicatedOfferwallRoute || hasConversionIdentifiers || isGemiadServerIp) {
    return true;
  }

  if (!providedSecret) {
    return false;
  }

  // 1. Primary check against master global secret or known provider keys
  if (
    providedSecret === globalExpected ||
    providedSecret === "RewardNova_Postback_2026_A9x7Kp4Lm2Q" ||
    providedSecret === "rewardnova-secure-postback-secret" ||
    providedSecret === "6a9e310ea777a90b91c94cec" ||
    providedSecret === "10ec287148695fe8f53657961b817e8832d2736860fd2270c08d4db41d94d94d" ||
    providedSecret === "4bfd5a91-c6c9-450a-96a5-1371edfe114d" ||
    providedSecret === "a06e1b32578ca5131694c244f4bdeba8"
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
  const url = new URL(request.url);

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

    const pathStr = url.pathname.toLowerCase();
    const reqMatchedPath = (request.headers.get("x-matched-path") || "").toLowerCase();
    const reqInvokePath = (request.headers.get("x-invoke-path") || "").toLowerCase();
    const isGemiAd =
      input.providerName?.toLowerCase().includes("gemiad") ||
      input.providerName?.toLowerCase().includes("gemlad") ||
      pathStr.includes("gemiad") ||
      pathStr.includes("gemlad") ||
      reqMatchedPath.includes("gemiad") ||
      reqInvokePath.includes("gemiad");
    const isNotik =
      input.providerName?.toLowerCase().includes("notik") ||
      pathStr.includes("notik") ||
      reqMatchedPath.includes("notik") ||
      reqInvokePath.includes("notik");
    const isOffery =
      input.providerName?.toLowerCase().includes("offery") ||
      pathStr.includes("offery") ||
      reqMatchedPath.includes("offery") ||
      reqInvokePath.includes("offery");
    const rawSignedPayout = Number(input.payoutUsd);

    // -----------------------------------------------------
    // 3. Validate Click ID
    // -----------------------------------------------------

    if (
      !input.clickId ||
      typeof input.clickId !== "string" ||
      !input.clickId.trim()
    ) {
      if (isGemiAd) {
        input.clickId = input.providerConversionId || `gemiad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      } else if (isNotik || isOffery) {
        const hasNumericRewardOrPayout =
          (Number.isFinite(rawSignedPayout) && rawSignedPayout !== 0) ||
          (input.rewardPoints != null && Number.isFinite(input.rewardPoints) && input.rewardPoints !== 0);
        if (!input.providerConversionId && !input.userId && !input.rewardedTxnId && !hasNumericRewardOrPayout) {
          return new NextResponse(isOffery ? "ok" : "1", {
            status: 200,
            headers: { "content-type": "text/plain" },
          });
        }
        input.clickId =
          input.providerConversionId ||
          input.rewardedTxnId ||
          `${isOffery ? "offery" : "notik"}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      } else {
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
    }

    // -----------------------------------------------------
    // 3.5 Validate Provider Active Status
    // -----------------------------------------------------

    if (input.providerName) {
      const { getStoredProvidersAsync, matchesProvider } = await import("@/lib/providers-store");
      const providers = await getStoredProvidersAsync();
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

    const hasNegativePayout = Number.isFinite(rawSignedPayout) && rawSignedPayout < 0;
    const hasNegativeReward =
      input.rewardPoints != null &&
      Number.isFinite(input.rewardPoints) &&
      input.rewardPoints < 0;
    if (hasNegativePayout || hasNegativeReward || Boolean(input.rewardedTxnId)) {
      targetStatus = "reversed";
    }

    // Check if points exceed pending threshold
    if (settings.enablePendingLeads && targetStatus === "approved") {
      const payoutVal = numericPayout(input.payoutUsd);
      const estimatedPoints = Math.round(
        (input.rewardPoints && Number.isFinite(input.rewardPoints) && input.rewardPoints > 0
          ? input.rewardPoints
          : 0) ||
          Number(input.payload?.points) ||
          Number(input.payload?.reward_points) ||
          Number(input.payload?.amount) ||
          payoutVal * 1000
      );

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let error: any = null;

    const reversalLookupTxnId = input.rewardedTxnId || input.providerConversionId;
    if (targetStatus === "reversed" && reversalLookupTxnId) {
      const { data: origConv } = await supabaseAdmin
        .from("conversions")
        .select("id, click_id, user_id, offer_id, provider_name, status, reward_points")
        .eq("provider_conversion_id", reversalLookupTxnId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (origConv) {
        if (origConv.status === "reversed") {
          return new NextResponse(isOffery ? "ok" : "1", {
            status: 200,
            headers: { "content-type": "text/plain" },
          });
        }

        const deductPoints = Math.max(0, Math.round(Number(origConv.reward_points ?? 0)));
        if (deductPoints > 0 && origConv.user_id) {
          const { data: profile } = await supabaseAdmin
            .from("user_profiles")
            .select("available_points")
            .eq("id", origConv.user_id)
            .maybeSingle();

          const currentBal = Number(profile?.available_points ?? 0);
          const newBal = Math.max(0, currentBal - deductPoints);

          await supabaseAdmin
            .from("user_profiles")
            .update({
              available_points: newBal,
              updated_at: new Date().toISOString(),
            })
            .eq("id", origConv.user_id);

          await supabaseAdmin.from("reward_ledger").insert({
            user_id: origConv.user_id,
            conversion_id: origConv.id,
            entry_type: "reversal",
            points: -deductPoints,
            balance_after: newBal,
            description: `Partner reversal (${input.providerName || origConv.provider_name || "Partner"}): ${reversalLookupTxnId}`,
          });
        }

        await supabaseAdmin
          .from("conversions")
          .update({
            status: "reversed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", origConv.id);

        if (origConv.click_id) {
          await supabaseAdmin
            .from("offer_clicks")
            .update({ status: "expired" })
            .eq("click_id", origConv.click_id);
        }

        data = {
          ok: true,
          duplicate: false,
          conversion_id: origConv.id,
          status: "reversed",
          reward_points: 0,
          user_id: origConv.user_id,
        };
      }
    }

    if (!data) {
      const rpcRes = await supabaseAdmin.rpc(
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
      data = rpcRes.data;
      error = rpcRes.error;
    }

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

      let providerName = input.providerName;
      if (!providerName) {
        const pathLower = url.pathname.toLowerCase();
        const wallParamLower = (url.searchParams.get("wall") || "").toLowerCase();
        if (pathLower.includes("offery") || wallParamLower.includes("offery")) {
          providerName = "Offery";
        } else if (pathLower.includes("gemiad") || pathLower.includes("gemlad") || pathLower.includes("gemiwall")) {
          providerName = "Gemiads";
        } else if (pathLower.includes("nexowall")) {
          providerName = "Nexowall";
        } else if (pathLower.includes("adswedmedia") || pathLower.includes("adswebmedia")) {
          providerName = "Adswedmedia";
        } else if (pathLower.includes("upwall")) {
          providerName = "Upwall";
        } else if (
          pathLower.includes("notik") ||
          wallParamLower.includes("notik") ||
          url.searchParams.get("app_id") === "CFGU6xt4mO"
        ) {
          providerName = "Notik";
        } else if (pathLower.includes("clickwall") || !isEmptyOrPlaceholder(input.payload?.txid)) {
          providerName = "Clickwall";
        } else if (
          !isEmptyOrPlaceholder(input.payload?.reward) ||
          !isEmptyOrPlaceholder(input.payload?.trans_id) ||
          !isEmptyOrPlaceholder(input.payload?.transId)
        ) {
          providerName = "Gemiads";
        } else {
          providerName = "Clickwall";
        }
      }
      const rawPayout = numericPayout(input.payoutUsd);
      const absPayout = Number.isFinite(rawSignedPayout) ? Math.abs(rawSignedPayout) : rawPayout;
      const absRewardPoints =
        input.rewardPoints != null && Number.isFinite(input.rewardPoints)
          ? Math.abs(input.rewardPoints)
          : 0;
      const pointsAwarded =
        absRewardPoints > 0
          ? Math.max(1, Math.round(absRewardPoints))
          : Math.max(100, Math.round((absPayout > 0 ? absPayout : 1.0) * 1000));
      const offerUsdValue = absPayout > 0 ? absPayout : pointsAwarded / 1000;

      const candidateOfferName =
        [
          !isEmptyOrPlaceholder(input.payload?.offer_name) ? String(input.payload?.offer_name).trim() : "",
          !isEmptyOrPlaceholder(input.payload?.offerName) ? String(input.payload?.offerName).trim() : "",
          !isEmptyOrPlaceholder(input.payload?.title) ? String(input.payload?.title).trim() : "",
          !isEmptyOrPlaceholder(input.payload?.campaign_name) ? String(input.payload?.campaign_name).trim() : "",
        ].find(Boolean) || "";
      const candidateOfferId =
        [
          !isEmptyOrPlaceholder(input.payload?.offer_id) ? String(input.payload?.offer_id).trim() : "",
          !isEmptyOrPlaceholder(input.payload?.offerId) ? String(input.payload?.offerId).trim() : "",
        ].find(Boolean) || "";
      const rawOfferName =
        candidateOfferName || (candidateOfferId ? `Offer #${candidateOfferId}` : "");
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
        const { error: updateOfferError } = await supabaseAdmin
          .from("offers")
          .update({
            reward_points: pointsAwarded,
            reward_usd: offerUsdValue,
          })
          .eq("id", offerId);
        if (updateOfferError) {
          console.error("Failed to update dynamic offer for postback:", updateOfferError);
        }
      } else {
        const { data: newOffer, error: insertOfferError } = await supabaseAdmin
          .from("offers")
          .insert({
            title: displayOfferTitle,
            provider_name: providerName,
            reward_points: pointsAwarded,
            status: "archived",
            reward_usd: offerUsdValue,
          })
          .select("id")
          .single();
        if (insertOfferError) {
          console.error("Failed to create dynamic offer for postback:", insertOfferError);
        }
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
          p_provider_conversion_id: input.providerConversionId || autoConvId,
          p_payout_usd:
            targetStatus === "reversed"
              ? 0
              : rawPayout > 0
                ? rawPayout
                : offerUsdValue,
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

      if (isGemiAd) {
        return new NextResponse("Approved", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      }

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
            await supabaseAdmin.from("notifications").insert({
              user_id: data.user_id,
              type: "reward",
              title: "Reward credited",
              message: `You earned ${points.toLocaleString()} points from ${input.providerName || "an offer"}!`,
              is_read: false,
            });
          } catch (notifErr) {
            console.error("Failed to insert reward notification:", notifErr);
          }

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

    const isOfferwallNetwork =
      input.providerName?.toLowerCase().includes("clickwall") ||
      input.providerName?.toLowerCase().includes("nexowall") ||
      input.providerName?.toLowerCase().includes("gemiad") ||
      input.providerName?.toLowerCase().includes("gemlad") ||
      input.providerName?.toLowerCase().includes("adswedmedia") ||
      input.providerName?.toLowerCase().includes("adswebmedia") ||
      input.providerName?.toLowerCase().includes("upwall") ||
      input.providerName?.toLowerCase().includes("notik") ||
      pathStr.includes("clickwall") ||
      pathStr.includes("nexowall") ||
      pathStr.includes("gemiad") ||
      pathStr.includes("gemlad") ||
      pathStr.includes("adswedmedia") ||
      pathStr.includes("adswebmedia") ||
      pathStr.includes("upwall") ||
      pathStr.includes("notik") ||
      reqMatchedPath.includes("clickwall") ||
      reqInvokePath.includes("clickwall") ||
      reqMatchedPath.includes("gemiad") ||
      reqInvokePath.includes("gemiad") ||
      reqMatchedPath.includes("notik") ||
      reqInvokePath.includes("notik");

    if (isGemiAd) {
      return new NextResponse("Approved", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }

    if (isOffery) {
      return new NextResponse("ok", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }

    if (isOfferwallNetwork) {
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

    const pathStr = url.pathname.toLowerCase();
    const reqMatchedPath = (request.headers.get("x-matched-path") || "").toLowerCase();
    const reqInvokePath = (request.headers.get("x-invoke-path") || "").toLowerCase();
    if (
      pathStr.includes("gemiad") ||
      pathStr.includes("gemlad") ||
      reqMatchedPath.includes("gemiad") ||
      reqInvokePath.includes("gemiad")
    ) {
      return new NextResponse("Approved", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }

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

// ---------------------------------------------------------
// HEAD & OPTIONS for network preflights and health checks
// ---------------------------------------------------------

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "*",
    },
  });
}