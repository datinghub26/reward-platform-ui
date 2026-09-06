import React from "react";
import ProviderManager from "./ProviderManager";
import { getStoredProvidersAsync } from "@/lib/providers-store";

export const dynamic = "force-dynamic";

export default async function AdminProvidersPage() {
  const providers = await getStoredProvidersAsync();
  return <ProviderManager initialProviders={providers} />;
}
