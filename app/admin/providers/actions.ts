"use server";

import { createClient } from "@/lib/supabase/server";
import {
  StoredProvider,
  getStoredProviders,
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
  if (isAdmin !== true) {
    throw new Error("Administrator access required.");
  }

  return user;
}

export async function saveProviderAction(provider: StoredProvider) {
  try {
    await verifyAdmin();
    const updated = addOrUpdateProvider(provider);
    revalidatePath("/admin/providers");
    revalidatePath("/earn");
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
    const updated = deleteStoredProvider(id);
    revalidatePath("/admin/providers");
    revalidatePath("/earn");
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
    const updated = toggleStoredProvider(id);
    revalidatePath("/admin/providers");
    revalidatePath("/earn");
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
    const list = getStoredProviders();
    return { success: true, providers: list };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load providers",
    };
  }
}
