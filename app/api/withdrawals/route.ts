import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPlatformSettings } from "@/lib/settings";
import { getActiveCashoutMethods } from "@/lib/cashouts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const settings = getPlatformSettings();
    if (settings.verifyEmailToWithdraw && !user.email_confirmed_at) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email verification required. Please verify your email address before requesting a withdrawal.",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const amountPoints = Number(body.amount_points);
    const paymentMethod =
      typeof body.payment_method === "string"
        ? body.payment_method.trim()
        : "";

    const paymentDetails =
      body.payment_details &&
      typeof body.payment_details === "object"
        ? body.payment_details
        : {};

    if (!Number.isInteger(amountPoints) || amountPoints <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "amount_points must be a positive integer",
        },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        {
          ok: false,
          error: "payment_method is required",
        },
        { status: 400 }
      );
    }

    // Validate payment method against active configured cashout methods
    const activeMethods = getActiveCashoutMethods();
    const matchedMethod = activeMethods.find(
      (m) =>
        m.id.toLowerCase() === paymentMethod.toLowerCase() ||
        m.name.toLowerCase() === paymentMethod.toLowerCase() ||
        m.name.toLowerCase().startsWith(paymentMethod.toLowerCase()) ||
        paymentMethod.toLowerCase().includes(m.name.toLowerCase())
    );

    if (!matchedMethod) {
      return NextResponse.json(
        {
          ok: false,
          error: `Payment method '${paymentMethod}' is currently disabled or unavailable.`,
        },
        { status: 400 }
      );
    }

    if (amountPoints < matchedMethod.minimum) {
      return NextResponse.json(
        {
          ok: false,
          error: `Minimum withdrawal for ${matchedMethod.name} is ${matchedMethod.minimum.toLocaleString()} points ($${(matchedMethod.minimum / 1000).toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    const canonicalMethod = matchedMethod.name;

    const { data, error } = await supabase.rpc(
      "create_withdrawal_request",
      {
        p_amount_points: amountPoints,
        p_payment_method: canonicalMethod,
        p_payment_details: paymentDetails,
      }
    );

    if (error) {
      console.error("Withdrawal creation failed:", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: user.id,
        type: "withdrawal",
        title: "Withdrawal Requested 💸",
        message: `Your payout request for ${amountPoints.toLocaleString()} points ($${(amountPoints / 1000).toFixed(2)}) via ${canonicalMethod.toUpperCase()} was received and is pending review.`,
        is_read: false,
      });
    } catch (notifErr) {
      console.error("Failed to insert withdrawal request notification:", notifErr);
    }

    return NextResponse.json({
      ok: true,
      withdrawal: data,
    });
  } catch (error) {
    console.error("Withdrawal request error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Invalid withdrawal request",
      },
      { status: 400 }
    );
  }
}