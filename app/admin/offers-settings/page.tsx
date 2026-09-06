import React from "react";
import ConfigManager from "./ConfigManager";
import { getOffersConfig } from "@/lib/offers-config";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const initialConfig = getOffersConfig();
  return <ConfigManager initialConfig={initialConfig} />;
}
