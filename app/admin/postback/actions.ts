"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";
import { getAppUrl } from "@/lib/url-helper";

import { verifyAdminSession } from "@/lib/supabase/admin-auth";

async function verifyAdmin() {
  const auth = await verifyAdminSession();
  if (!auth.isAdmin || !auth.user) {
    throw new Error(auth.error || "Administrator access required.");
  }
  return auth.user;
}

export async function addProviderCredential(providerName: string, customSecret?: string) {
  try {
    await verifyAdmin();

    const name = providerName.trim();
    if (!name) {
      return { success: false, error: "Provider network name is required." };
    }

    const secret = customSecret?.trim() || crypto.randomBytes(32).toString("hex");

    const { data, error } = await supabaseAdmin
      .from("provider_postback_auth")
      .insert({
        provider_name: name,
        api_secret: secret,
        enabled: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add provider auth:", error);
      return { success: false, error: error.message };
    }

    return { success: true, provider: data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add provider" };
  }
}

export async function toggleProviderCredential(id: string, currentEnabled: boolean) {
  try {
    await verifyAdmin();

    const { error } = await supabaseAdmin
      .from("provider_postback_auth")
      .update({
        enabled: !currentEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to toggle provider" };
  }
}

export async function deleteProviderCredential(id: string) {
  try {
    await verifyAdmin();

    const { error } = await supabaseAdmin
      .from("provider_postback_auth")
      .delete()
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete provider" };
  }
}

export async function testPostbackSimulation({
  clickId,
  status,
  providerName,
  token,
}: {
  clickId: string;
  status: string;
  providerName?: string;
  token?: string;
}) {
  try {
    await verifyAdmin();

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXT_PUBLIC_APP_URL || getAppUrl());
    const postbackSecret = token || process.env.POSTBACK_SECRET || "RewardNova_Postback_2026_A9x7Kp4Lm2Q";

    const url = new URL("/api/postback", baseUrl);
    url.searchParams.set("click_id", clickId.trim());
    url.searchParams.set("status", status);
    if (providerName) url.searchParams.set("provider_name", providerName.trim());
    if (postbackSecret) url.searchParams.set("token", postbackSecret);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-postback-secret": postbackSecret,
      },
    });

    const data = await response.json();
    return {
      success: response.ok,
      status: response.status,
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to execute postback simulation",
    };
  }
}
