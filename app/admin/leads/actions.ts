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

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin === true) {
    return { authorized: true, adminUser: user };
  }

  const { data: adminRecord } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminRecord) {
    return { authorized: true, adminUser: user };
  }

  return { authorized: false, error: "Administrator access required." };
}

export async function getLeadDetailsAction(conversionId: string) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("conversions")
      .select("*, offers(title, category, reward_points, reward_usd)")
      .eq("id", conversionId)
      .single();

    if (convErr || !conv) {
      return { success: false, error: "Conversion record not found." };
    }

    let clickData = null;
    if (conv.click_id) {
      const { data: click } = await supabaseAdmin
        .from("offer_clicks")
        .select("*")
        .eq("click_id", conv.click_id)
        .maybeSingle();
      clickData = click;
    }

    const [profileRes, authUserRes] = await Promise.all([
      supabaseAdmin
        .from("user_profiles")
        .select("id, display_name, available_points, lifetime_points, country_code, status")
        .eq("id", conv.user_id)
        .maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(conv.user_id),
    ]);

    const profile = profileRes.data;
    const authUser = authUserRes.data?.user;

    return {
      success: true,
      data: {
        conversion: conv,
        click: clickData,
        user: {
          id: conv.user_id,
          email: authUser?.email || "Unknown",
          display_name: profile?.display_name || authUser?.email?.split("@")[0] || "User",
          available_points: Number(profile?.available_points ?? 0),
          lifetime_points: Number(profile?.lifetime_points ?? 0),
          country_code: profile?.country_code || clickData?.country_code || "BD",
          status: profile?.status || "active",
        },
      },
    };
  } catch (err: unknown) {
    console.error("getLeadDetailsAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to load lead details." };
  }
}

export async function reverseLeadAction(params: {
  conversionId: string;
  reason?: string;
}) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const { conversionId, reason } = params;

  try {
    // 1. Fetch conversion
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("conversions")
      .select("*")
      .eq("id", conversionId)
      .single();

    if (convErr || !conv) {
      return { success: false, error: "Conversion record not found." };
    }

    if (conv.status === "reversed") {
      return { success: false, error: "This conversion is already reversed." };
    }

    const rewardPoints = Number(conv.reward_points ?? 0);
    const userId = conv.user_id;

    // 2. Try process_offer_postback RPC if click_id and provider_conversion_id exist
    let rpcSuccess = false;
    if (conv.click_id && conv.provider_conversion_id) {
      try {
        const { data: revRpc, error: rpcErr } = await supabaseAdmin.rpc("process_offer_postback", {
          p_click_id: conv.click_id,
          p_status: "reversed",
          p_provider_name: conv.provider_name || "RewardNova Admin",
          p_provider_conversion_id: conv.provider_conversion_id,
          p_payout_usd: Number(conv.payout_usd ?? 0),
          p_payload: { reason: reason?.trim() || "Manual Admin Reversal" },
        });

        if (!rpcErr && revRpc?.ok) {
          rpcSuccess = true;
        }
      } catch (rpcEx) {
        console.warn("RPC reversal fallback triggered:", rpcEx);
      }
    }

    // 3. Fallback direct atomic reversal if RPC did not handle
    if (!rpcSuccess) {
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("available_points")
        .eq("id", userId)
        .single();

      const currentBal = Number(profile?.available_points ?? 0);
      const newBal = Math.max(0, currentBal - rewardPoints);

      await supabaseAdmin
        .from("user_profiles")
        .update({
          available_points: newBal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      await supabaseAdmin.from("reward_ledger").insert({
        user_id: userId,
        conversion_id: conversionId,
        entry_type: "reversal",
        points: -Math.abs(rewardPoints),
        balance_after: newBal,
        description: `Admin reversal: ${reason?.trim() || "Manual lead reversal"}`,
        created_at: new Date().toISOString(),
      });

      await supabaseAdmin
        .from("conversions")
        .update({
          status: "reversed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversionId);
    }

    // 4. Deliver in-app notification to member
    if (rewardPoints > 0) {
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Lead Reversed ⚠️",
        message: `Your reward of ${rewardPoints.toLocaleString()} points was reversed by admin: "${reason?.trim() || "Manual lead reversal"}"`,
        is_read: false,
      });
    }

    revalidatePath("/admin/leads");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    console.error("reverseLeadAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to reverse lead." };
  }
}

export async function deleteLeadAction(conversionId: string) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    // Unlink conversion_id from reward_ledger to satisfy foreign key constraints
    // while maintaining permanent financial audit logs
    await supabaseAdmin
      .from("reward_ledger")
      .update({ conversion_id: null })
      .eq("conversion_id", conversionId);

    const { error } = await supabaseAdmin
      .from("conversions")
      .delete()
      .eq("id", conversionId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/leads");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    console.error("deleteLeadAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to delete lead." };
  }
}

export async function bulkDeleteLeadsAction(conversionIds: string[]) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  if (!conversionIds || conversionIds.length === 0) {
    return { success: false, error: "No leads selected for deletion." };
  }

  try {
    // Unlink conversion_ids from reward_ledger to satisfy foreign key constraints
    await supabaseAdmin
      .from("reward_ledger")
      .update({ conversion_id: null })
      .in("conversion_id", conversionIds);

    const { error } = await supabaseAdmin
      .from("conversions")
      .delete()
      .in("id", conversionIds);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/leads");
    revalidatePath("/admin");
    return { success: true, count: conversionIds.length };
  } catch (err: unknown) {
    console.error("bulkDeleteLeadsAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to bulk delete leads." };
  }
}
