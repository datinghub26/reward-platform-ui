"use server";

import { revalidatePath } from "next/cache";
import { getOffersConfig, getOffersConfigAsync, saveOffersConfig, saveOffersConfigAsync } from "@/lib/offers-config";
import { OffersPlatformConfig } from "@/lib/offers-config-types";

export async function getOffersConfigAction(): Promise<OffersPlatformConfig> {
  return await getOffersConfigAsync();
}

export async function saveOffersConfigAction(
  data: OffersPlatformConfig
): Promise<{ success: boolean; config?: OffersPlatformConfig; error?: string }> {
  try {
    const success = await saveOffersConfigAsync(data);
    if (!success) {
      return { success: false, error: "Failed to persist configuration" };
    }
    revalidatePath("/admin/offers-settings");
    revalidatePath("/admin/providers");
    revalidatePath("/earn");
    return { success: true, config: await getOffersConfigAsync() };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error saving configuration",
    };
  }
}
