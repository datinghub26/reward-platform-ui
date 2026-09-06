import React from "react";
import CampaignManager from "./CampaignManager";
import { getCampaigns } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const campaigns = getCampaigns();

  return <CampaignManager initialCampaigns={campaigns} />;
}
