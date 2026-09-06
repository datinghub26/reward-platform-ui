"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: "Authentication required." };
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) {
    return { authorized: false, error: "Administrator access required." };
  }

  return { authorized: true, adminUser: user };
}

export async function updateUserAction(params: {
  userId: string;
  displayName?: string;
  role?: "admin" | "user";
  status?: "active" | "suspended" | "banned";
  pointsDelta?: number;
  reason?: string;
}) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const { userId, displayName, role, status, pointsDelta = 0, reason } = params;

  try {
    // 1. Fetch current profile
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("user_profiles")
      .select("available_points, lifetime_points, status, display_name")
      .eq("id", userId)
      .single();

    if (profErr || !profile) {
      return { success: false, error: "User profile not found." };
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (displayName !== undefined && displayName.trim()) {
      updates.display_name = displayName.trim();
    }

    if (status !== undefined) {
      updates.status = status;
    }

    // 2. Process points adjustment if specified
    if (pointsDelta !== 0) {
      const currentAvailable = Number(profile.available_points ?? 0);
      const currentLifetime = Number(profile.lifetime_points ?? 0);
      const newAvailable = Math.max(0, currentAvailable + pointsDelta);
      const newLifetime = pointsDelta > 0 ? currentLifetime + pointsDelta : currentLifetime;

      updates.available_points = newAvailable;
      updates.lifetime_points = newLifetime;

      // Insert audit entry in reward_ledger
      await supabaseAdmin.from("reward_ledger").insert({
        user_id: userId,
        conversion_id: null,
        entry_type: pointsDelta > 0 ? "credit" : "debit",
        points: Math.abs(pointsDelta),
        balance_after: newAvailable,
        description:
          reason?.trim() ||
          `Admin adjustment: ${pointsDelta > 0 ? "+" : ""}${pointsDelta.toLocaleString()} points`,
        created_at: new Date().toISOString(),
      });

      // Send member notification
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: pointsDelta > 0 ? "reward" : "system",
        title: pointsDelta > 0 ? "Points Credited! 🎁" : "Points Deducted ℹ️",
        message:
          reason?.trim()
            ? `Admin adjusted your balance by ${pointsDelta > 0 ? "+" : ""}${pointsDelta.toLocaleString()} points: "${reason.trim()}"`
            : `Your balance was adjusted by ${pointsDelta > 0 ? "+" : ""}${pointsDelta.toLocaleString()} points by the platform administrator.`,
        is_read: false,
      });
    }

    // 3. Update user_profiles
    const { error: updateErr } = await supabaseAdmin
      .from("user_profiles")
      .update(updates)
      .eq("id", userId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 4. Update role in admin_users if requested
    if (role !== undefined) {
      if (role === "admin") {
        await supabaseAdmin
          .from("admin_users")
          .upsert({ user_id: userId }, { onConflict: "user_id" });
      } else {
        // Prevent removing oneself from admin
        if (userId !== auth.adminUser?.id) {
          await supabaseAdmin
            .from("admin_users")
            .delete()
            .eq("user_id", userId);
        }
      }
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    console.error("updateUserAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to update user." };
  }
}

export async function toggleUserBanAction(
  userId: string,
  targetStatus: "active" | "banned"
) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  // Prevent banning oneself
  if (userId === auth.adminUser?.id) {
    return { success: false, error: "You cannot ban your own administrator account." };
  }

  try {
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (targetStatus === "banned") {
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Account Suspended ⚠️",
        message: "Your account has been restricted by platform administration.",
        is_read: false,
      });
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || "Failed to toggle user status." };
  }
}

export async function createUserAction(params: {
  email: string;
  password?: string;
  displayName?: string;
  role?: "admin" | "user";
}) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const { email, password = "RewardNova2026!", displayName, role = "user" } = params;

  if (!email || !email.includes("@")) {
    return { success: false, error: "A valid email address is required." };
  }

  try {
    // 1. Create auth user
    const { data: authData, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName?.trim() || email.split("@")[0],
      },
    });

    if (createAuthErr || !authData.user) {
      return { success: false, error: createAuthErr?.message || "Failed to create user account." };
    }

    const newUserId = authData.user.id;

    // 2. Ensure profile exists and set display_name
    await supabaseAdmin
      .from("user_profiles")
      .upsert({
        id: newUserId,
        display_name: displayName?.trim() || email.split("@")[0],
        status: "active",
        available_points: 0,
        pending_points: 0,
        lifetime_points: 0,
        created_at: new Date().toISOString(),
      }, { onConflict: "id" });

    // 3. Grant admin role if requested
    if (role === "admin") {
      await supabaseAdmin
        .from("admin_users")
        .upsert({ user_id: newUserId }, { onConflict: "user_id" });
    }

    revalidatePath("/admin/users");
    return { success: true, userId: newUserId };
  } catch (err: unknown) {
    console.error("createUserAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to create user." };
  }
}

export async function getUserDetailsAction(userId: string) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error, data: null };
  }

  try {
    const [profileRes, authUserRes, conversionsRes, withdrawalsRes, ledgerRes] = await Promise.all([
      supabaseAdmin.from("user_profiles").select("*").eq("id", userId).single(),
      supabaseAdmin.auth.admin.getUserById(userId),
      supabaseAdmin.from("conversions").select("id, status, reward_points, payout_usd, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabaseAdmin.from("withdrawals").select("id, status, amount_usd, amount_points, payment_method, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabaseAdmin.from("reward_ledger").select("id, entry_type, points, balance_after, description, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    ]);

    const profile = profileRes.data;
    const authUser = authUserRes.data?.user;

    const { count: totalConversions } = await supabaseAdmin
      .from("conversions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "approved");

    const { count: totalWithdrawals } = await supabaseAdmin
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    return {
      success: true,
      data: {
        profile,
        email: authUser?.email || "unknown@example.com",
        lastSignInAt: authUser?.last_sign_in_at,
        conversions: conversionsRes.data ?? [],
        withdrawals: withdrawalsRes.data ?? [],
        ledger: ledgerRes.data ?? [],
        totalApprovedConversions: totalConversions ?? 0,
        totalWithdrawalsCount: totalWithdrawals ?? 0,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message, data: null };
  }
}
