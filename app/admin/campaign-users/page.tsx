import React from "react";
import CampaignUsersList from "./CampaignUsersList";
import { getCampaignParticipants } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export default async function AdminCampaignUsersPage() {
  const participants = getCampaignParticipants();

  return <CampaignUsersList initialParticipants={participants} />;
}
