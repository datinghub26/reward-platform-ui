import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function handleSignOut(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error signing out user:", error);
  }

  const url = new URL("/login", request.url);
  return NextResponse.redirect(url, { status: 302 });
}

export async function POST(request: Request) {
  return handleSignOut(request);
}

export async function GET(request: Request) {
  return handleSignOut(request);
}
