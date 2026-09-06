import React from "react";
import ConfigManager from "./ConfigManager";
import { getOffersConfigAsync } from "@/lib/offers-config";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const initialConfig = await getOffersConfigAsync();
  return <ConfigManager initialConfig={initialConfig} />;
}
