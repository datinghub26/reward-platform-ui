import fs from "fs";
import path from "path";
import { supabaseAdmin } from "./supabase/admin";
import { getPlatformSettings } from "./settings";

export interface ReferralRecord {
  referredUserId: string;
  referrerUserId: string;
  referredEmail?: string;
  joinedAt: string;
  commissionPointsEarned: number;
  bonusPointsAwarded: number;
}

export interface ReferralStats {
  totalReferred: number;
  commissionRate: number;
  totalCommissionPoints: number;
  totalCommissionUsd: number;
  invitees: Array<{
    id: string;
    email: string;
    joinedAt: string;
    commissionEarned: number;
  }>;
}

const REFERRALS_FILE = path.join(process.cwd(), "data", "referrals.json");

function triggerRevalidation() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/referrals");
    revalidatePath("/dashboard");
  } catch {
    // No-op in non-Next.js runtimes
  }
}

export function getReferrals(): ReferralRecord[] {
  try {
    if (fs.existsSync(REFERRALS_FILE)) {
      const raw = fs.readFileSync(REFERRALS_FILE, "utf8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw);
      return Array.isArray(data.referrals) ? data.referrals : [];
    }
  } catch (err) {
    console.error("Error reading referrals.json:", err);
  }
  return [];
}

export function saveReferrals(referrals: ReferralRecord[]): boolean {
  try {
    const dir = path.dirname(REFERRALS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      REFERRALS_FILE,
      JSON.stringify({ referrals }, null, 2),
      "utf8"
    );
    triggerRevalidation();
    return true;
  } catch (err) {
    console.error("Error saving referrals.json:", err);
    return false;
  }
}

/**
 * Finds a referrer's user ID given their referral code (typically the first 8 chars of their UUID).
 */
export async function findUserByReferralCode(
  referralCode: string
): Promise<{ id: string; displayName?: string } | null> {
  if (!referralCode || !referralCode.trim()) return null;
  const cleanCode = referralCode.trim().toLowerCase();

  try {
    // 1. Check user_profiles directly
    const { data: profiles, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, display_name");

    if (!error && profiles) {
      const match = profiles.find(
        (p) =>
          p.id.toLowerCase().startsWith(cleanCode) ||
          p.id.toLowerCase() === cleanCode
      );
      if (match) {
        return { id: match.id, displayName: match.display_name ?? undefined };
      }
    }
  } catch (err) {
    console.error("Error looking up referral code in user_profiles:", err);
  }

  return null;
}

/**
 * Permanently binds a newly registered user to their referrer.
 * Also grants the welcome bonus if configured in settings.
 */
export async function recordReferral(
  referredUserId: string,
  referralCode: string,
  referredEmail?: string
): Promise<{ success: boolean; referrerId?: string; bonusPoints?: number; error?: string }> {
  if (!referredUserId || !referralCode) {
    return { success: false, error: "Missing user ID or referral code" };
  }

  const current = getReferrals();
  // Check if user is already registered under a referral
  const existing = current.find((r) => r.referredUserId === referredUserId);
  if (existing) {
    return { success: true, referrerId: existing.referrerUserId };
  }

  const referrer = await findUserByReferralCode(referralCode);
  if (!referrer) {
    return { success: false, error: "Invalid referral code" };
  }

  // Prevent self-referrals
  if (referrer.id === referredUserId) {
    return { success: false, error: "Self-referral is not allowed" };
  }

  const settings = getPlatformSettings();
  let bonusAwarded = 0;

  // Award welcome bonus if enabled
  if (settings.enableReferrals && settings.referralSignupBonus > 0) {
    bonusAwarded = settings.referralSignupBonus;
    try {
      // 1. Fetch current profile
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("available_points, lifetime_points")
        .eq("id", referredUserId)
        .maybeSingle();

      if (profile) {
        const nextAvail = Number(profile.available_points || 0) + bonusAwarded;
        const nextLife = Number(profile.lifetime_points || 0) + bonusAwarded;

        // 2. Update user profile
        await supabaseAdmin
          .from("user_profiles")
          .update({
            available_points: nextAvail,
            lifetime_points: nextLife,
            updated_at: new Date().toISOString(),
          })
          .eq("id", referredUserId);

        // 3. Create immutable ledger record
        await supabaseAdmin.from("reward_ledger").insert({
          user_id: referredUserId,
          entry_type: "credit",
          points: bonusAwarded,
          balance_after: nextAvail,
          reason: "Welcome bonus: Referral signup bonus",
          metadata: {
            referrer_user_id: referrer.id,
            referral_code: referralCode,
          },
        });

        // 4. Send notification
        await supabaseAdmin.from("notifications").insert({
          user_id: referredUserId,
          type: "reward",
          title: "Welcome Bonus Credited! 🎁",
          message: `You received +${bonusAwarded.toLocaleString()} points for signing up via an invitation link!`,
          is_read: false,
        });
      }
    } catch (bonusErr) {
      console.error("Failed to credit referral welcome bonus:", bonusErr);
    }
  }

  const newRecord: ReferralRecord = {
    referredUserId,
    referrerUserId: referrer.id,
    referredEmail: referredEmail || undefined,
    joinedAt: new Date().toISOString(),
    commissionPointsEarned: 0,
    bonusPointsAwarded: bonusAwarded,
  };

  current.push(newRecord);
  saveReferrals(current);

  return {
    success: true,
    referrerId: referrer.id,
    bonusPoints: bonusAwarded,
  };
}

/**
 * Calculates and returns full referral statistics for a member.
 */
export function getReferralStats(userId: string): ReferralStats {
  const all = getReferrals();
  const userInvitees = all.filter((r) => r.referrerUserId === userId);
  const settings = getPlatformSettings();

  const totalPoints = userInvitees.reduce(
    (sum, r) => sum + (Number(r.commissionPointsEarned) || 0),
    0
  );

  return {
    totalReferred: userInvitees.length,
    commissionRate: settings.enableReferrals ? settings.referralCommissionRate : 0,
    totalCommissionPoints: totalPoints,
    totalCommissionUsd: Number((totalPoints / 1000).toFixed(2)),
    invitees: userInvitees.map((inv) => {
      let mask = "Member";
      if (inv.referredEmail) {
        const [userPart, domain] = inv.referredEmail.split("@");
        mask = (userPart?.slice(0, 3) || "usr") + "***@" + (domain || "...");
      } else {
        mask = "User #" + inv.referredUserId.slice(0, 6);
      }
      return {
        id: inv.referredUserId,
        email: mask,
        joinedAt: inv.joinedAt,
        commissionEarned: inv.commissionPointsEarned,
      };
    }),
  };
}

/**
 * Invoked on approved offer postback to award referral commission.
 */
export async function processReferralCommission(
  convertingUserId: string,
  rewardPoints: number
): Promise<{ success: boolean; referrerId?: string; commissionPoints?: number } | null> {
  if (!convertingUserId || rewardPoints <= 0) return null;

  const settings = getPlatformSettings();
  if (!settings.enableReferrals || settings.referralCommissionRate <= 0) {
    return null;
  }

  const all = getReferrals();
  const recordIndex = all.findIndex((r) => r.referredUserId === convertingUserId);
  if (recordIndex < 0) return null;

  const record = all[recordIndex];
  const rate = settings.referralCommissionRate;
  const commissionPoints = Math.max(1, Math.round(rewardPoints * (rate / 100)));

  try {
    // 1. Fetch referrer's current profile
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("available_points, lifetime_points")
      .eq("id", record.referrerUserId)
      .maybeSingle();

    if (error || !profile) {
      console.error("Referrer user profile not found for ID:", record.referrerUserId);
      return null;
    }

    const nextAvail = Number(profile.available_points || 0) + commissionPoints;
    const nextLife = Number(profile.lifetime_points || 0) + commissionPoints;

    // 2. Update referrer profile
    await supabaseAdmin
      .from("user_profiles")
      .update({
        available_points: nextAvail,
        lifetime_points: nextLife,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.referrerUserId);

    // 3. Create immutable ledger record
    await supabaseAdmin.from("reward_ledger").insert({
      user_id: record.referrerUserId,
      entry_type: "credit",
      points: commissionPoints,
      balance_after: nextAvail,
      reason: `Referral commission (${rate}% from friend offer completion)`,
      metadata: {
        converting_user_id: convertingUserId,
        commission_rate: rate,
        original_offer_points: rewardPoints,
      },
    });

    // 4. Send notification to referrer
    await supabaseAdmin.from("notifications").insert({
      user_id: record.referrerUserId,
      type: "reward",
      title: "Referral Commission Earned! 💸",
      message: `You earned +${commissionPoints.toLocaleString()} points (${rate}% commission) from your invited friend!`,
      is_read: false,
    });

    // 5. Update referral record total
    record.commissionPointsEarned = (record.commissionPointsEarned || 0) + commissionPoints;
    all[recordIndex] = record;
    saveReferrals(all);

    return {
      success: true,
      referrerId: record.referrerUserId,
      commissionPoints,
    };
  } catch (err) {
    console.error("Failed to process referral commission:", err);
    return null;
  }
}
