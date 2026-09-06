"use server";

import {
  getCampaigns,
  saveCampaign,
  deleteCampaign,
  Campaign,
} from "@/lib/campaigns";

export async function getCampaignsAction() {
  try {
    const campaigns = getCampaigns();
    return { success: true, campaigns };
  } catch (err) {
    console.error("getCampaignsAction error:", err);
    return { success: false, error: "Failed to load campaigns", campaigns: [] };
  }
}

export async function saveCampaignAction(data: {
  id?: string;
  title: string;
  description: string;
  multiplier: number;
  bonusPoints: number;
  status: "active" | "scheduled" | "completed" | "paused";
  targetProviders?: string;
  startDate: string;
  endDate: string;
}) {
  try {
    if (!data.title?.trim()) {
      return { success: false, error: "Campaign title is required" };
    }

    const campaignId = data.id || `camp-${Date.now()}`;
    const campaign: Campaign = {
      id: campaignId,
      title: data.title.trim(),
      description: data.description?.trim() || "",
      multiplier: Math.max(1, Number(data.multiplier) || 1),
      bonusPoints: Math.max(0, Number(data.bonusPoints) || 0),
      status: data.status,
      targetProviders: data.targetProviders || "all",
      startDate: data.startDate || new Date().toISOString(),
      endDate: data.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    const saved = saveCampaign(campaign);
    if (!saved) {
      return { success: false, error: "Failed to write campaign data" };
    }

    return {
      success: true,
      message: `Campaign "${campaign.title}" saved successfully!`,
      campaign,
    };
  } catch (err) {
    console.error("saveCampaignAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error saving campaign",
    };
  }
}

export async function toggleCampaignStatusAction(
  id: string,
  newStatus: "active" | "scheduled" | "completed" | "paused"
) {
  try {
    const campaigns = getCampaigns();
    const target = campaigns.find((c) => c.id === id);
    if (!target) {
      return { success: false, error: "Campaign not found" };
    }

    target.status = newStatus;
    const ok = saveCampaign(target);
    return {
      success: ok,
      message: `Campaign status updated to ${newStatus}`,
    };
  } catch (err) {
    console.error("toggleCampaignStatusAction error:", err);
    return { success: false, error: "Failed to update campaign status" };
  }
}

export async function deleteCampaignAction(id: string) {
  try {
    const ok = deleteCampaign(id);
    return {
      success: ok,
      message: ok ? "Campaign deleted successfully" : "Campaign not found",
    };
  } catch (err) {
    console.error("deleteCampaignAction error:", err);
    return { success: false, error: "Failed to delete campaign" };
  }
}
