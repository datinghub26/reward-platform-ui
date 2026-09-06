import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

export interface Campaign {
  id: string;
  title: string;
  description: string;
  multiplier: number;
  bonusPoints: number;
  status: "active" | "scheduled" | "completed" | "paused";
  targetProviders: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface CampaignParticipant {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  campaignId: string;
  campaignTitle: string;
  status: "completed" | "in_progress";
  rewardPoints: number;
  joinedDate: string;
}

const CONFIG_KEY = "campaigns";
const FALLBACK_FILE = "campaigns.json";
const USERS_CONFIG_KEY = "campaign_users";
const USERS_FALLBACK_FILE = "campaign-users.json";

function triggerRevalidation() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/admin/campaigns");
    revalidatePath("/admin/campaign-users");
    revalidatePath("/earn");
  } catch {
    // No-op in non-Next.js runtime
  }
}

export function getCampaigns(): Campaign[] {
  const data = getLocalFallbackConfig<{ campaigns: Campaign[] }>(FALLBACK_FILE, { campaigns: [] });
  return Array.isArray(data.campaigns) ? data.campaigns : [];
}

export async function getCampaignsAsync(): Promise<Campaign[]> {
  const fallback = getCampaigns();
  const data = await getSystemConfig<{ campaigns: Campaign[] }>(CONFIG_KEY, FALLBACK_FILE, { campaigns: fallback });
  return Array.isArray(data.campaigns) ? data.campaigns : [];
}

export async function getActiveCampaignsAsync(): Promise<Campaign[]> {
  const all = await getCampaignsAsync();
  const now = new Date();
  return all.filter((c) => {
    if (c.status !== "active") return false;
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);
    return now >= start && now <= end;
  });
}

export function getActiveCampaigns(): Campaign[] {
  const all = getCampaigns();
  const now = new Date();
  return all.filter((c) => {
    if (c.status !== "active") return false;
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);
    return now >= start && now <= end;
  });
}

export async function saveCampaignAsync(campaign: Campaign): Promise<boolean> {
  try {
    const campaigns = await getCampaignsAsync();
    const index = campaigns.findIndex((c) => c.id === campaign.id);
    if (index >= 0) {
      campaigns[index] = campaign;
    } else {
      campaigns.unshift(campaign);
    }
    const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, { campaigns });
    triggerRevalidation();
    return ok;
  } catch (err) {
    console.error("Error saving campaign:", err);
    return false;
  }
}

export function saveCampaign(campaign: Campaign): boolean {
  saveCampaignAsync(campaign).catch((e) => console.error("Async saveCampaign error:", e));
  return true;
}

export async function deleteCampaignAsync(id: string): Promise<boolean> {
  try {
    const campaigns = await getCampaignsAsync();
    const filtered = campaigns.filter((c) => c.id !== id);
    if (filtered.length !== campaigns.length) {
      const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, { campaigns: filtered });
      triggerRevalidation();
      return ok;
    }
    return true;
  } catch (err) {
    console.error("Error deleting campaign:", err);
    return false;
  }
}

export function deleteCampaign(id: string): boolean {
  deleteCampaignAsync(id).catch((e) => console.error("Async deleteCampaign error:", e));
  return true;
}

export function getCampaignParticipants(): CampaignParticipant[] {
  const data = getLocalFallbackConfig<{ participants: CampaignParticipant[] }>(USERS_FALLBACK_FILE, { participants: [] });
  return Array.isArray(data.participants) ? data.participants : [];
}

export async function getCampaignParticipantsAsync(): Promise<CampaignParticipant[]> {
  const fallback = getCampaignParticipants();
  const data = await getSystemConfig<{ participants: CampaignParticipant[] }>(USERS_CONFIG_KEY, USERS_FALLBACK_FILE, { participants: fallback });
  return Array.isArray(data.participants) ? data.participants : [];
}

export async function recordCampaignParticipantAsync(
  participant: Omit<CampaignParticipant, "id">
): Promise<boolean> {
  try {
    const participants = await getCampaignParticipantsAsync();
    const newRecord: CampaignParticipant = {
      ...participant,
      id: `cu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    participants.unshift(newRecord);
    const ok = await setSystemConfig(USERS_CONFIG_KEY, USERS_FALLBACK_FILE, { participants });
    triggerRevalidation();
    return ok;
  } catch (err) {
    console.error("Error recording campaign participant:", err);
    return false;
  }
}

export function recordCampaignParticipant(
  participant: Omit<CampaignParticipant, "id">
): boolean {
  recordCampaignParticipantAsync(participant).catch((e) => console.error("Async record participant error:", e));
  return true;
}
