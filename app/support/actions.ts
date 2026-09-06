"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSupportTicket(data: {
  subject: string;
  message: string;
  priority?: string;
}) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to open a support ticket." };
    }

    const subject = data.subject?.trim();
    const message = data.message?.trim();
    const priority = data.priority?.trim() || "normal";

    if (!subject || subject.length < 3) {
      return { success: false, error: "Subject must be at least 3 characters long." };
    }

    if (!message || message.length < 10) {
      return { success: false, error: "Message must be at least 10 characters long." };
    }

    const fullMessage =
      priority && priority !== "normal"
        ? `[Priority: ${priority.toUpperCase()}]\n${message}`
        : message;

    const { error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject,
        message: fullMessage,
        status: "open",
      });

    if (insertError) {
      console.error("Support ticket creation error:", insertError);
      return { success: false, error: insertError.message || "Failed to submit ticket." };
    }

    revalidatePath("/support");
    return { success: true };
  } catch (err) {
    console.error("Support ticket unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
