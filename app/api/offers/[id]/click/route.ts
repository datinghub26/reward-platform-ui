import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * DEPRECATED: This legacy route has been decommissioned.
 * All authenticated offer clicks are canonically created via the
 * secure PostgreSQL RPC `create_offer_click`.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Deprecated endpoint: Offer clicks must be created via the secure create_offer_click RPC.",
    },
    { status: 410 }
  );
}

