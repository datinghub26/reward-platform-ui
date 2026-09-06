"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type UpdateProfileInput = {
  displayName: string;
  timezone: string;
};

export async function updateProfile(input: UpdateProfileInput) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "You must be signed in to update your profile.",
      };
    }

    const displayName = input.displayName.trim();
    if (!displayName || displayName.length < 2) {
      return {
        success: false,
        error: "Display name must be at least 2 characters long.",
      };
    }

    if (displayName.length > 50) {
      return {
        success: false,
        error: "Display name cannot exceed 50 characters.",
      };
    }

    const timezone = input.timezone ? input.timezone.trim() : "UTC";

    // Update only safe whitelisted fields (Country is fixed/IP-based and cannot be edited by user)
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        display_name: displayName,
        timezone: timezone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return {
        success: false,
        error: updateError.message,
      };
    }

    // Also update auth user metadata for display name
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        display_name: displayName,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return {
      success: true,
      error: null,
    };
  } catch (err) {
    console.error("Unexpected profile update error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update profile.",
    };
  }
}
