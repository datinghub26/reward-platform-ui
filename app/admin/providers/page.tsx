import React from "react";
import ProviderManager from "./ProviderManager";
import { getStoredProviders } from "@/lib/providers-store";

export const dynamic = "force-dynamic";

export default async function AdminProvidersPage() {
  const providers = getStoredProviders();
  return <ProviderManager initialProviders={providers} />;
}
