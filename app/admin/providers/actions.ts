"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  StoredProvider,
  getStoredProvidersAsync,
  addOrUpdateProvider,
  deleteStoredProvider,
  toggleStoredProvider,
} from "@/lib/providers-store";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin === true) {
    return user;
  }

  const { data: adminRecord } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminRecord) {
    return user;
  }

  throw new Error("Administrator access required.");
}

export async function saveProviderAction(provider: StoredProvider) {
  try {
    await verifyAdmin();
    const updated = await addOrUpdateProvider(provider);
    try {
      const { syncProvidersWithOffersConfigAsync } = await import("@/lib/offers-config");
      await syncProvidersWithOffersConfigAsync();
    } catch (syncErr) {
      console.error("Failed to sync offers config:", syncErr);
    }
    revalidatePath("/admin/providers");
    revalidatePath("/admin/offers-settings");
    revalidatePath("/earn");
    revalidatePath("/", "layout");
    return { success: true, providers: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save provider",
    };
  }
}

export async function deleteProviderAction(id: string) {
  try {
    await verifyAdmin();
    const updated = await deleteStoredProvider(id);
    try {
      const { syncProvidersWithOffersConfigAsync } = await import("@/lib/offers-config");
      await syncProvidersWithOffersConfigAsync();
    } catch (syncErr) {
      console.error("Failed to sync offers config:", syncErr);
    }
    revalidatePath("/admin/providers");
    revalidatePath("/admin/offers-settings");
    revalidatePath("/earn");
    revalidatePath("/", "layout");
    return { success: true, providers: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete provider",
    };
  }
}

export async function toggleProviderAction(id: string) {
  try {
    await verifyAdmin();
    const updated = await toggleStoredProvider(id);
    try {
      const { syncProvidersWithOffersConfigAsync } = await import("@/lib/offers-config");
      await syncProvidersWithOffersConfigAsync();
    } catch (syncErr) {
      console.error("Failed to sync offers config:", syncErr);
    }
    revalidatePath("/admin/providers");
    revalidatePath("/admin/offers-settings");
    revalidatePath("/earn");
    revalidatePath("/", "layout");
    return { success: true, providers: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle provider",
    };
  }
}

export async function getProvidersAction() {
  try {
    const list = await getStoredProvidersAsync();
    return { success: true, providers: list };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load providers",
    };
  }
}
