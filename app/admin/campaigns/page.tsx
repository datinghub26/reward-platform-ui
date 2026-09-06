import React from "react";
import CampaignManager from "./CampaignManager";
import { getCampaignsAsync } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const campaigns = await getCampaignsAsync();

  return <CampaignManager initialCampaigns={campaigns} />;
}
