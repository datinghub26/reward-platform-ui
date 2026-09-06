import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "You must be signed in.",
      },
      { status: 401 }
    );
  }

  const result = await createNotification({
    userId: user.id,
    type: "system",
    title: "Welcome to RewardNova",
    message:
      "Your notification center is now active.",
  });

  if (!result.success) {
    return NextResponse.json(result, {
      status: 500,
    });
  }

  return NextResponse.json(result);
}