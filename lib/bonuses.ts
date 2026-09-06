import fs from "fs";
import path from "path";

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

const PROMO_CODES_FILE = path.join(process.cwd(), "data", "promo-codes.json");

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
  try {
    if (fs.existsSync(PROMO_CODES_FILE)) {
      const raw = fs.readFileSync(PROMO_CODES_FILE, "utf8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw);
      if (Array.isArray(data.codes)) {
        return data.codes;
      }
    }
  } catch (err) {
    console.error("Error reading promo-codes.json:", err);
  }
  return [];
}

export function savePromoCode(promo: PromoCode): boolean {
  try {
    const codes = getPromoCodes();
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

    const dir = path.dirname(PROMO_CODES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROMO_CODES_FILE, JSON.stringify({ codes }, null, 2), "utf8");
    triggerRevalidation();
    return true;
  } catch (err) {
    console.error("Error saving promo code:", err);
    return false;
  }
}

export function deletePromoCode(id: string): boolean {
  try {
    const codes = getPromoCodes();
    const filtered = codes.filter((c) => c.id !== id);
    if (filtered.length !== codes.length) {
      fs.writeFileSync(PROMO_CODES_FILE, JSON.stringify({ codes: filtered }, null, 2), "utf8");
      triggerRevalidation();
      return true;
    }
  } catch (err) {
    console.error("Error deleting promo code:", err);
  }
  return false;
}

export interface PromoRedemptionResult {
  success: boolean;
  points: number;
  promo?: PromoCode;
  error?: string;
}

export function validateAndRedeemPromoCode(
  codeStr: string
): PromoRedemptionResult {
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

  // Increment usedCount
  promo.usedCount += 1;
  savePromoCode(promo);

  return { success: true, points: promo.rewardPoints, promo };
}

