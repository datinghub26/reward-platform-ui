"use server";

import { revalidatePath } from "next/cache";
import {
  getCashoutMethods,
  toggleCashoutMethod,
  updateCashoutMethod,
  createCashoutMethod,
  deleteCashoutMethod,
  CashoutMethod,
} from "@/lib/cashouts";

export async function getCashoutMethodsAction(): Promise<CashoutMethod[]> {
  return getCashoutMethods();
}

export async function toggleCashoutMethodAction(
  id: string
): Promise<{ success: boolean; method?: CashoutMethod; error?: string }> {
  try {
    const updated = toggleCashoutMethod(id);
    if (!updated) return { success: false, error: "Method not found" };
    revalidatePath("/admin/cashouts");
    revalidatePath("/withdraw");
    return { success: true, method: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle method",
    };
  }
}

export async function updateCashoutMethodAction(
  id: string,
  updates: Partial<CashoutMethod>
): Promise<{ success: boolean; method?: CashoutMethod; error?: string }> {
  try {
    const updated = updateCashoutMethod(id, updates);
    if (!updated) return { success: false, error: "Method not found" };
    revalidatePath("/admin/cashouts");
    revalidatePath("/withdraw");
    return { success: true, method: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update method",
    };
  }
}

export async function createCashoutMethodAction(
  input: Omit<CashoutMethod, "id">
): Promise<{ success: boolean; method?: CashoutMethod; error?: string }> {
  try {
    if (!input.name?.trim()) {
      return { success: false, error: "Method name is required" };
    }
    const created = createCashoutMethod({
      name: input.name.trim(),
      logo: input.logo?.trim() || "💎",
      category: input.category || "Crypto",
      bg_color: input.bg_color || "#162033",
      payment_title: input.payment_title?.trim() || `Enter your ${input.name.trim()} wallet address`,
      status: input.status ?? true,
      fee: input.fee?.trim() || "0%",
      minimum: Math.max(1, Number(input.minimum) || 100),
    });
    revalidatePath("/admin/cashouts");
    revalidatePath("/withdraw");
    return { success: true, method: created };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create method",
    };
  }
}

export async function deleteCashoutMethodAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const deleted = deleteCashoutMethod(id);
    revalidatePath("/admin/cashouts");
    revalidatePath("/withdraw");
    return { success: deleted };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete method",
    };
  }
}