import React from "react";
import SettingsManager from "./SettingsManager";
import { getPlatformSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const initialSettings = getPlatformSettings();
  return <SettingsManager initialSettings={initialSettings} />;
}
