"use server";

import { revalidatePath } from "next/cache";
import {
  PromoCode,
  savePromoCodeAsync,
  deletePromoCodeAsync,
  getPromoCodesAsync,
} from "@/lib/bonuses";
import { logAdminAudit } from "@/lib/audit-logger";

export async function savePromoCodeAction(promo: PromoCode) {
  try {
    if (!promo.code?.trim()) {
      return { success: false, error: "Promo code string is required." };
    }
    if (promo.rewardPoints <= 0) {
      return { success: false, error: "Reward points must be greater than 0." };
    }

    const ok = await savePromoCodeAsync(promo);
    if (!ok) {
      return { success: false, error: "Failed to save promo code." };
    }

    await logAdminAudit({
      action: "save_promo_code",
      category: "rewards",
      details: `Saved Promo Code "${promo.code.toUpperCase()}": +${promo.rewardPoints} pts (Limit: ${promo.maxUses})`,
    });

    revalidatePath("/admin/bonuses");
    return { success: true, message: `Promo code "${promo.code.toUpperCase()}" saved.` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save promo code." };
  }
}

export async function togglePromoCodeStatusAction(id: string, active: boolean) {
  try {
    const codes = await getPromoCodesAsync();
    const target = codes.find((c) => c.id === id);
    if (!target) {
      return { success: false, error: "Promo code not found." };
    }

    target.active = active;
    await savePromoCodeAsync(target);

    await logAdminAudit({
      action: "toggle_promo_code",
      category: "rewards",
      details: `Turned ${active ? "ON" : "OFF"} promo code "${target.code}"`,
    });

    revalidatePath("/admin/bonuses");
    return { success: true, message: `Promo code status set to ${active ? "Active" : "Inactive"}.` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to toggle status." };
  }
}

export async function deletePromoCodeAction(id: string) {
  try {
    const ok = await deletePromoCodeAsync(id);
    if (!ok) {
      return { success: false, error: "Failed to delete promo code." };
    }

    await logAdminAudit({
      action: "delete_promo_code",
      category: "rewards",
      details: `Deleted promo code #${id}`,
    });

    revalidatePath("/admin/bonuses");
    return { success: true, message: "Promo code deleted." };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete." };
  }
}
