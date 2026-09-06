import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

export interface PromoCode {
  id: string;
  code: string;
  rewardPoints: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

const CONFIG_KEY = "promo_codes";
const FALLBACK_FILE = "promo-codes.json";

function triggerRevalidation() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/admin/bonuses");
    revalidatePath("/dashboard");
    revalidatePath("/profile");
  } catch {
    // No-op in non-Next.js runtime
  }
}

export function getPromoCodes(): PromoCode[] {
  const data = getLocalFallbackConfig<{ codes: PromoCode[] }>(FALLBACK_FILE, { codes: [] });
  return Array.isArray(data.codes) ? data.codes : [];
}

export async function getPromoCodesAsync(): Promise<PromoCode[]> {
  const fallback = getPromoCodes();
  const data = await getSystemConfig<{ codes: PromoCode[] }>(CONFIG_KEY, FALLBACK_FILE, { codes: fallback });
  return Array.isArray(data.codes) ? data.codes : [];
}

export async function savePromoCodeAsync(promo: PromoCode): Promise<boolean> {
  try {
    const codes = await getPromoCodesAsync();
    const index = codes.findIndex((c) => c.id === promo.id || c.code.toUpperCase() === promo.code.toUpperCase());

    const cleanPromo: PromoCode = {
      ...promo,
      code: promo.code.toUpperCase().trim(),
      rewardPoints: Number(promo.rewardPoints) || 0,
      maxUses: Number(promo.maxUses) || 0,
      usedCount: Number(promo.usedCount) || 0,
    };

    if (index >= 0) {
      codes[index] = cleanPromo;
    } else {
      codes.unshift(cleanPromo);
    }

    const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, { codes });
    triggerRevalidation();
    return ok;
  } catch (err) {
    console.error("Error saving promo code:", err);
    return false;
  }
}

export function savePromoCode(promo: PromoCode): boolean {
  savePromoCodeAsync(promo).catch((e) => console.error("Async savePromoCode error:", e));
  return true;
}

export async function deletePromoCodeAsync(id: string): Promise<boolean> {
  try {
    const codes = await getPromoCodesAsync();
    const filtered = codes.filter((c) => c.id !== id);
    if (filtered.length !== codes.length) {
      const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, { codes: filtered });
      triggerRevalidation();
      return ok;
    }
    return true;
  } catch (err) {
    console.error("Error deleting promo code:", err);
    return false;
  }
}

export function deletePromoCode(id: string): boolean {
  deletePromoCodeAsync(id).catch((e) => console.error("Async deletePromoCode error:", e));
  return true;
}

export interface PromoRedemptionResult {
  success: boolean;
  points: number;
  promo?: PromoCode;
  error?: string;
}

export async function validateAndRedeemPromoCodeAsync(
  codeStr: string
): Promise<PromoRedemptionResult> {
  const codes = await getPromoCodesAsync();
  const cleanCode = codeStr.trim().toUpperCase();
  const promo = codes.find((c) => c.code.toUpperCase() === cleanCode);

  if (!promo) {
    return { success: false, points: 0, error: "Invalid promo voucher code." };
  }

  if (!promo.active) {
    return { success: false, points: 0, error: "This promo voucher is no longer active." };
  }

  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
    return { success: false, points: 0, error: "This promo voucher has expired." };
  }

  if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
    return { success: false, points: 0, error: "This promo voucher has reached its maximum redemption limit." };
  }

  // Increment usedCount
  promo.usedCount += 1;
  await savePromoCodeAsync(promo);

  return { success: true, points: promo.rewardPoints, promo };
}

export function validateAndRedeemPromoCode(codeStr: string): PromoRedemptionResult {
  const codes = getPromoCodes();
  const cleanCode = codeStr.trim().toUpperCase();
  const promo = codes.find((c) => c.code.toUpperCase() === cleanCode);

  if (!promo) {
    return { success: false, points: 0, error: "Invalid promo voucher code." };
  }
  if (!promo.active) {
    return { success: false, points: 0, error: "This promo voucher is no longer active." };
  }
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
    return { success: false, points: 0, error: "This promo voucher has expired." };
  }
  if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
    return { success: false, points: 0, error: "This promo voucher has reached its maximum redemption limit." };
  }

  promo.usedCount += 1;
  savePromoCode(promo);
  return { success: true, points: promo.rewardPoints, promo };
}
