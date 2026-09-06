import React from "react";
import SettingsManager from "./SettingsManager";
import { getPlatformSettingsAsync } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const initialSettings = await getPlatformSettingsAsync();
  return <SettingsManager initialSettings={initialSettings} />;
}
