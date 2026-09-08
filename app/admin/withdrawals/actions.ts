"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdminSession } from "@/lib/supabase/admin-auth";

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "paid"
  | "rejected";

export async function updateWithdrawal(
  withdrawalId: string,
  status: WithdrawalStatus,
  adminNote?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const auth = await verifyAdminSession();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    // 3. Validate status
    if (!["pending", "processing", "paid", "rejected"].includes(status)) {
      return { success: false, error: "Invalid withdrawal status." };
    }

    if (!withdrawalId || withdrawalId.trim() === "") {
      return { success: false, error: "Withdrawal ID is required." };
    }

    // 4. Fetch the existing withdrawal record
    const { data: wRecord, error: fetchErr } = await supabaseAdmin
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single();

    if (fetchErr || !wRecord) {
      return { success: false, error: "Withdrawal record not found." };
    }

    const previousStatus = wRecord.status;
    const nowIso = new Date().toISOString();
    const amountPoints = Number(wRecord.amount_points ?? Math.round(Number(wRecord.amount_usd ?? 0) * 1000));
    const methodStr = String(wRecord.payment_method ?? "").toUpperCase();
    const amountUsdStr = Number(wRecord.amount_usd ?? 0).toFixed(2);

    // 5. Handle financial refund if moving to "rejected" from non-rejected
    if (status === "rejected" && previousStatus !== "rejected") {
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("available_points")
        .eq("id", wRecord.user_id)
        .single();

      const currentBalance = Number(profile?.available_points ?? 0);
      const newBalance = currentBalance + amountPoints;

      // Restore user balance
      await supabaseAdmin
        .from("user_profiles")
        .update({
          available_points: newBalance,
          updated_at: nowIso,
        })
        .eq("id", wRecord.user_id);

      // Audit credit in reward_ledger
      await supabaseAdmin.from("reward_ledger").insert({
        user_id: wRecord.user_id,
        entry_type: "credit",
        points: amountPoints,
        balance_after: newBalance,
        description: `Refund: Rejected withdrawal #${withdrawalId.slice(0, 8)} (${methodStr})`,
        conversion_id: null,
      });
    }

    // 6. Handle re-deduction if moving away from "rejected" back to active/paid
    if (previousStatus === "rejected" && status !== "rejected") {
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("available_points")
        .eq("id", wRecord.user_id)
        .single();

      const currentBalance = Number(profile?.available_points ?? 0);
      if (currentBalance < amountPoints) {
        return {
          success: false,
          error: `User only has ${currentBalance.toLocaleString()} points. Cannot re-deduct ${amountPoints.toLocaleString()} points.`,
        };
      }

      const newBalance = currentBalance - amountPoints;

      await supabaseAdmin
        .from("user_profiles")
        .update({
          available_points: newBalance,
          updated_at: nowIso,
        })
        .eq("id", wRecord.user_id);

      await supabaseAdmin.from("reward_ledger").insert({
        user_id: wRecord.user_id,
        entry_type: "debit",
        points: amountPoints,
        balance_after: newBalance,
        description: `Withdrawal re-opened: #${withdrawalId.slice(0, 8)} (${methodStr})`,
        conversion_id: null,
      });
    }

    // 7. Update withdrawal record
    const updatePayload: Record<string, unknown> = {
      status,
      admin_note: adminNote?.trim() || null,
      updated_at: nowIso,
    };

    if (status === "paid" || status === "rejected") {
      updatePayload.processed_at = nowIso;
    } else {
      updatePayload.processed_at = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from("withdrawals")
      .update(updatePayload)
      .eq("id", withdrawalId);

    if (updateError) {
      console.error("Withdrawal update failed:", updateError);
      return { success: false, error: updateError.message };
    }

    // 8. Deliver notification to user
    try {
      let notifTitle = "Withdrawal Updated";
      let notifMessage = `Your withdrawal request status was updated to ${status}.`;

      if (status === "paid") {
        notifTitle = "Payout Sent! 💸";
        notifMessage = `Your cashout of $${amountUsdStr} via ${methodStr} has been approved and paid!`;
      } else if (status === "processing") {
        notifTitle = "Withdrawal Processing ⏳";
        notifMessage = `Your withdrawal of $${amountUsdStr} via ${methodStr} is currently being processed.`;
      } else if (status === "rejected") {
        notifTitle = "Withdrawal Rejected & Refunded ❌";
        notifMessage = `Your cashout of $${amountUsdStr} was rejected and ${amountPoints.toLocaleString()} points were refunded to your balance.${
          adminNote ? ` Reason: ${adminNote.trim()}` : ""
        }`;
      }

      await supabaseAdmin.from("notifications").insert({
        user_id: wRecord.user_id,
        type: "withdrawal",
        title: notifTitle,
        message: notifMessage,
        is_read: false,
      });
    } catch (notifErr) {
      console.error("Failed to send notification:", notifErr);
    }

    revalidatePath("/admin/withdrawals");
    revalidatePath("/admin/requests");
    revalidatePath("/withdraw");

    return {
      success: true,
      message: `Withdrawal #${withdrawalId.slice(0, 8)} updated to ${status}.`,
    };
  } catch (err) {
    console.error("updateWithdrawal unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update withdrawal",
    };
  }
}

export async function deleteWithdrawalAction(
  withdrawalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminSession();
    if (!auth.isAdmin) {
      return { success: false, error: auth.error || "Administrator access required." };
    }

    // Fetch withdrawal
    const { data: wRecord } = await supabaseAdmin
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single();

    if (!wRecord) {
      return { success: false, error: "Withdrawal not found." };
    }

    // If pending or processing, refund before deleting
    if (wRecord.status === "pending" || wRecord.status === "processing") {
      const amountPoints = Number(wRecord.amount_points ?? Math.round(Number(wRecord.amount_usd ?? 0) * 1000));
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("available_points")
        .eq("id", wRecord.user_id)
        .single();

      const currentBalance = Number(profile?.available_points ?? 0);
      const newBalance = currentBalance + amountPoints;

      await supabaseAdmin
        .from("user_profiles")
        .update({ available_points: newBalance, updated_at: new Date().toISOString() })
        .eq("id", wRecord.user_id);

      await supabaseAdmin.from("reward_ledger").insert({
        user_id: wRecord.user_id,
        entry_type: "credit",
        points: amountPoints,
        balance_after: newBalance,
        description: `Refund: Deleted withdrawal #${withdrawalId.slice(0, 8)}`,
        conversion_id: null,
      });
    }

    const { error: delErr } = await supabaseAdmin
      .from("withdrawals")
      .delete()
      .eq("id", withdrawalId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    revalidatePath("/admin/withdrawals");
    revalidatePath("/admin/requests");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete withdrawal",
    };
  }
}

export async function bulkUpdateWithdrawalsAction(
  withdrawalIds: string[],
  status: WithdrawalStatus,
  adminNote?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let successCount = 0;
    for (const id of withdrawalIds) {
      const res = await updateWithdrawal(id, status, adminNote);
      if (res.success) successCount++;
    }
    revalidatePath("/admin/withdrawals");
    revalidatePath("/admin/requests");
    return { success: true, count: successCount };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Bulk update failed",
    };
  }
}