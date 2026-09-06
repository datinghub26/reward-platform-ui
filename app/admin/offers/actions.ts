"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type OfferInput = {
  title: string;
  provider_name: string;
  category: string;
  offer_type: string;
  reward_points: number;
  reward_usd: number;
  icon: string;
  tracking_url: string;
  countries: string[];
  devices: string[];
  description?: string;
  featured?: boolean;
  popular?: boolean;
  status?: string;
};

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    throw new Error("Administrator access required.");
  }

  return user;
}

export async function createOffer(input: OfferInput) {
  try {
    await verifyAdmin();

    const points = Math.max(1, Math.round(Number(input.reward_points) || 1000));
    const usd = Number(input.reward_usd) || points / 1000;

    const { data, error } = await supabaseAdmin
      .from("offers")
      .insert({
        title: input.title.trim(),
        provider_name: input.provider_name.trim() || "RewardNova",
        category: input.category || "CPA",
        offer_type: input.offer_type || input.category || "CPA",
        reward_points: points,
        reward_usd: usd,
        icon: input.icon?.trim() || "🎁",
        tracking_url: input.tracking_url?.trim() || "http://localhost:3000/demo-provider?click_id={click_id}",
        countries: Array.isArray(input.countries) ? input.countries : [],
        devices: Array.isArray(input.devices) && input.devices.length > 0 ? input.devices : ["Desktop", "Mobile"],
        description: input.description?.trim() || "Complete qualifying activity to earn points.",
        featured: Boolean(input.featured),
        popular: Boolean(input.popular),
        status: input.status || "active",
        requirements: ["Complete all provider requirements", "Allow verification time"],
        terms: ["Reward credited only after verified conversion"],
        priority: 50,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create offer:", error);
      return { success: false, error: error.message };
    }

    return { success: true, offer: data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create offer" };
  }
}

export async function updateOffer(offerId: string, input: Partial<OfferInput>) {
  try {
    await verifyAdmin();

    if (!offerId) {
      return { success: false, error: "Offer ID is required." };
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.provider_name !== undefined) updatePayload.provider_name = input.provider_name.trim();
    if (input.category !== undefined) {
      updatePayload.category = input.category;
      updatePayload.offer_type = input.category;
    }
    if (input.reward_points !== undefined) {
      const points = Math.max(1, Math.round(Number(input.reward_points) || 1000));
      updatePayload.reward_points = points;
      updatePayload.reward_usd = input.reward_usd !== undefined ? Number(input.reward_usd) : points / 1000;
    }
    if (input.icon !== undefined) updatePayload.icon = input.icon.trim() || "🎁";
    if (input.tracking_url !== undefined) updatePayload.tracking_url = input.tracking_url.trim();
    if (input.countries !== undefined) updatePayload.countries = input.countries;
    if (input.devices !== undefined) updatePayload.devices = input.devices;
    if (input.description !== undefined) updatePayload.description = input.description.trim();
    if (input.featured !== undefined) updatePayload.featured = Boolean(input.featured);
    if (input.popular !== undefined) updatePayload.popular = Boolean(input.popular);
    if (input.status !== undefined) updatePayload.status = input.status;

    const { error } = await supabaseAdmin
      .from("offers")
      .update(updatePayload)
      .eq("id", offerId);

    if (error) {
      console.error("Failed to update offer:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update offer" };
  }
}

export async function toggleOfferStatus(offerId: string, currentStatus: string) {
  const nextStatus = currentStatus === "active" ? "paused" : "active";
  return updateOffer(offerId, { status: nextStatus });
}

export async function deleteOffer(offerId: string) {
  try {
    await verifyAdmin();

    if (!offerId) {
      return { success: false, error: "Offer ID is required." };
    }

    const { error } = await supabaseAdmin
      .from("offers")
      .delete()
      .eq("id", offerId);

    if (error) {
      console.error("Failed to delete offer:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete offer" };
  }
}
