import { createClient } from "@/lib/supabase/server";

export type NotificationType =
  | "system"
  | "reward"
  | "withdrawal"
  | "account";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
};

export async function createNotification({
  userId,
  type,
  title,
  message,
}: CreateNotificationInput) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "create_notification",
    {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
    }
  );

  if (error) {
    console.error(
      "Failed to create notification:",
      error
    );

    return {
      success: false,
      error: error.message,
      notification: null,
    };
  }

  return {
    success: true,
    error: null,
    notification: data,
  };
}