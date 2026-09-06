import fs from "fs";
import path from "path";

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

const CAMPAIGNS_FILE = path.join(process.cwd(), "data", "campaigns.json");
const PARTICIPANTS_FILE = path.join(process.cwd(), "data", "campaign-users.json");

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
  try {
    if (fs.existsSync(CAMPAIGNS_FILE)) {
      const raw = fs.readFileSync(CAMPAIGNS_FILE, "utf8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw);
      return Array.isArray(data.campaigns) ? data.campaigns : [];
    }
  } catch (err) {
    console.error("Error reading campaigns.json:", err);
  }
  return [];
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

export function saveCampaign(campaign: Campaign): boolean {
  try {
    const campaigns = getCampaigns();
    const index = campaigns.findIndex((c) => c.id === campaign.id);
    if (index >= 0) {
      campaigns[index] = campaign;
    } else {
      campaigns.unshift(campaign);
    }
    const dir = path.dirname(CAMPAIGNS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify({ campaigns }, null, 2), "utf8");
    triggerRevalidation();
    return true;
  } catch (err) {
    console.error("Error saving campaign:", err);
    return false;
  }
}

export function deleteCampaign(id: string): boolean {
  try {
    const campaigns = getCampaigns();
    const filtered = campaigns.filter((c) => c.id !== id);
    if (filtered.length !== campaigns.length) {
      fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify({ campaigns: filtered }, null, 2), "utf8");
      triggerRevalidation();
      return true;
    }
  } catch (err) {
    console.error("Error deleting campaign:", err);
  }
  return false;
}

export function getCampaignParticipants(): CampaignParticipant[] {
  try {
    if (fs.existsSync(PARTICIPANTS_FILE)) {
      const raw = fs.readFileSync(PARTICIPANTS_FILE, "utf8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw);
      return Array.isArray(data.participants) ? data.participants : [];
    }
  } catch (err) {
    console.error("Error reading campaign-users.json:", err);
  }
  return [];
}

export function recordCampaignParticipant(
  participant: Omit<CampaignParticipant, "id">
): boolean {
  try {
    const participants = getCampaignParticipants();
    const newRecord: CampaignParticipant = {
      ...participant,
      id: `cu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    participants.unshift(newRecord);
    const dir = path.dirname(PARTICIPANTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify({ participants }, null, 2), "utf8");
    triggerRevalidation();
    return true;
  } catch (err) {
    console.error("Error recording campaign participant:", err);
    return false;
  }
}
