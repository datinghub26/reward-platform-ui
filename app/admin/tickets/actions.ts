"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function updateTicketStatusAction(
  ticketId: string,
  newStatus: "open" | "in_progress" | "resolved" | "closed",
  adminReply?: string
) {
  try {
    if (!ticketId) {
      return { success: false, error: "Ticket ID is required" };
    }

    // 1. Fetch ticket to get user_id and subject
    const { data: ticket, error: fetchErr } = await supabaseAdmin
      .from("support_tickets")
      .select("id, user_id, subject")
      .eq("id", ticketId)
      .maybeSingle();

    if (fetchErr || !ticket) {
      return { success: false, error: "Support ticket not found" };
    }

    // 2. Update status in support_tickets table
    const { error: updateErr } = await supabaseAdmin
      .from("support_tickets")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (updateErr) {
      console.error("Failed to update ticket status:", updateErr);
      return { success: false, error: updateErr.message };
    }

    // 3. If admin provided a reply or resolved the ticket, notify the user
    if (adminReply?.trim() || newStatus === "resolved") {
      try {
        const messageText = adminReply?.trim()
          ? adminReply.trim()
          : `Your support ticket "${ticket.subject}" has been marked as ${newStatus} by our support team.`;

        await supabaseAdmin.from("notifications").insert({
          user_id: ticket.user_id,
          type: "system",
          title: `Support Ticket ${newStatus === "resolved" ? "Resolved ✓" : "Update 💬"}`,
          message: messageText,
          is_read: false,
        });
      } catch (notifErr) {
        console.error("Failed to send ticket notification:", notifErr);
      }
    }

    revalidatePath("/admin/tickets");
    revalidatePath("/support");

    return {
      success: true,
      message: `Ticket marked as ${newStatus}`,
    };
  } catch (err) {
    console.error("updateTicketStatusAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update ticket",
    };
  }
}

export async function deleteTicketAction(ticketId: string) {
  try {
    const { error } = await supabaseAdmin
      .from("support_tickets")
      .delete()
      .eq("id", ticketId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/tickets");
    return { success: true, message: "Ticket deleted successfully" };
  } catch (err) {
    console.error("deleteTicketAction error:", err);
    return { success: false, error: "Failed to delete ticket" };
  }
}
