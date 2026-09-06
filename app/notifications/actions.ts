"use server";

import { createClient } from "@/lib/supabase/server";

export async function markNotificationAsRead(
  notificationId: string
) {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // 1. Verify signed-in user
  // ---------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  // ---------------------------------------------------------
  // 2. Update only this user's notification
  // ---------------------------------------------------------

  const {
    data: updatedNotification,
    error,
  } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select(
      `
        id,
        user_id,
        is_read
      `
    )
    .maybeSingle();

  // ---------------------------------------------------------
  // 3. Database error
  // ---------------------------------------------------------

  if (error) {
    console.error(
      "Mark notification as read failed:",
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }

  // ---------------------------------------------------------
  // 4. Make sure a row was actually updated
  // ---------------------------------------------------------

  if (!updatedNotification) {
    console.error(
      "Notification update affected 0 rows.",
      {
        notificationId,
        userId: user.id,
      }
    );

    return {
      success: false,
      error:
        "Notification could not be updated. Check notification ownership and RLS.",
    };
  }

  // ---------------------------------------------------------
  // 5. Verify database value
  // ---------------------------------------------------------

  if (updatedNotification.is_read !== true) {
    console.error(
      "Notification update returned an unexpected value.",
      updatedNotification
    );

    return {
      success: false,
      error:
        "Notification update was not applied.",
    };
  }

  // ---------------------------------------------------------
  // 6. Success
  // ---------------------------------------------------------

  return {
    success: true,
    notificationId: updatedNotification.id,
    isRead: true,
  };
}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Mark all notifications as read failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}