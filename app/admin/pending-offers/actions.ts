"use server";

import { revalidatePath } from "next/cache";
import {
  getPendingRules,
  createPendingRule,
  togglePendingRule,
  deletePendingRule,
  PendingOfferRule,
} from "@/lib/pending-rules";

export async function getRulesAction(): Promise<PendingOfferRule[]> {
  return getPendingRules();
}

export async function createRuleAction(input: {
  offer_id: string;
  offer_title: string;
  hold_duration: string;
  notes: string;
}): Promise<{ success: boolean; rule?: PendingOfferRule; error?: string }> {
  try {
    if (!input.offer_id.trim()) {
      return { success: false, error: "Offer ID is required" };
    }
    const rule = createPendingRule({
      offer_id: input.offer_id.trim(),
      offer_title: input.offer_title.trim() || "Custom / Direct ID",
      hold_duration: input.hold_duration || "7 Days",
      active: true,
      notes: input.notes.trim() || "High risk offer",
    });
    revalidatePath("/admin/pending-offers");
    return { success: true, rule };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create rule",
    };
  }
}

export async function toggleRuleAction(
  id: string
): Promise<{ success: boolean; rule?: PendingOfferRule; error?: string }> {
  try {
    const updated = togglePendingRule(id);
    if (!updated) return { success: false, error: "Rule not found" };
    revalidatePath("/admin/pending-offers");
    return { success: true, rule: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle rule",
    };
  }
}

export async function deleteRuleAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const deleted = deletePendingRule(id);
    revalidatePath("/admin/pending-offers");
    return { success: deleted };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete rule",
    };
  }
}