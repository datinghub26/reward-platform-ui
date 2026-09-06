import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clickId = request.nextUrl.searchParams.get("click_id");

    if (!clickId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing click_id",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Process conversion through the secure server-side reward engine
    const { data: result, error: postbackError } = await supabaseAdmin.rpc(
      "process_offer_postback",
      {
        p_click_id: clickId.trim(),
        p_status: "approved",
        p_provider_name: "RewardNova Demo",
        p_provider_conversion_id: `demo-${clickId.trim()}`,
        p_payout_usd: 5.0,
        p_payload: { simulated_by: "demo-provider", user_id: user.id },
      }
    );

    if (postbackError) {
      console.error("Demo conversion postback failed:", postbackError);
      return NextResponse.json(
        {
          success: false,
          error: postbackError.message,
        },
        { status: 500 }
      );
    }

    const acceptHeader = request.headers.get("accept") ?? "";
    if (acceptHeader.includes("text/html")) {
      return NextResponse.redirect(
        new URL("/dashboard?reward=credited", request.url)
      );
    }

    return NextResponse.json({
      success: true,
      message: "Demo conversion processed successfully.",
      result,
    });
  } catch (error) {
    console.error("Demo conversion endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}