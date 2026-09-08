import { User } from "@supabase/supabase-js";
import { createClient } from "./server";
import { supabaseAdmin } from "./admin";

export type AdminAuthResult = {
  authorized: boolean;
  isAdmin: boolean;
  user: User | null;
  adminUser: User | null;
  error?: string;
};

/**
 * Robust admin verification helper for Next.js Server Actions.
 * Checks:
 * 1. Active Supabase Auth user (via getUser fallback to getSession)
 * 2. Supabase is_admin RPC
 * 3. Supabase admin_users table (via service role)
 */
export async function verifyAdminSession(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient();
    const [userRes, sessionRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ]);

    const user = userRes.data?.user || sessionRes.data?.session?.user || null;

    if (!user) {
      return {
        authorized: false,
        isAdmin: false,
        user: null,
        adminUser: null,
        error: "Authentication required.",
      };
    }

    // Check RPC first
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin === true) {
      return { authorized: true, isAdmin: true, user, adminUser: user };
    }

    // Fallback: check admin_users table directly with service role
    const { data: adminRecord } = await supabaseAdmin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminRecord) {
      return { authorized: true, isAdmin: true, user, adminUser: user };
    }

    return {
      authorized: false,
      isAdmin: false,
      user,
      adminUser: null,
      error: "Administrator access required.",
    };
  } catch (err: unknown) {
    console.error("verifyAdminSession unexpected error:", err);
    return {
      authorized: false,
      isAdmin: false,
      user: null,
      adminUser: null,
      error: "Authentication check failed.",
    };
  }
}

