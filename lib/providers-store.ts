import fs from "fs";
import path from "path";
import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

export interface StoredProvider {
  id: string;
  name: string;
  type: "offer" | "survey";
  badge: string;
  active: boolean;
  url: string;
  show_rate: boolean;
  rate: string;
  logo?: string;
  description?: string;
  color?: string;
}

const CONFIG_KEY = "providers";
const FALLBACK_FILE = "providers.json";

function triggerRevalidation() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/admin/providers");
    revalidatePath("/admin/offers-settings");
    revalidatePath("/earn");
  } catch {
    // No-op outside Next.js request
  }
}

export function matchesProvider(p: StoredProvider, identifier: string): boolean {
  if (!identifier) return false;
  const cleanTarget = identifier.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanId = (p.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanName = (p.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  return p.id === identifier || cleanId === cleanTarget || cleanName === cleanTarget;
}

/**
 * Synchronous provider getter (uses local fallback file).
 */
export function getStoredProviders(): StoredProvider[] {
  return getLocalFallbackConfig<StoredProvider[]>(FALLBACK_FILE, [], CONFIG_KEY);
}

/**
 * Asynchronous provider getter (queries Supabase system_config first, persistent on Vercel).
 */
export async function getStoredProvidersAsync(): Promise<StoredProvider[]> {
  const localDefault = getStoredProviders();
  return getSystemConfig<StoredProvider[]>(CONFIG_KEY, FALLBACK_FILE, localDefault);
}

export async function saveStoredProvidersAsync(providers: StoredProvider[]): Promise<boolean> {
  const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, providers);
  triggerRevalidation();
  return ok;
}

export async function addOrUpdateProvider(provider: StoredProvider): Promise<StoredProvider[]> {
  const current = await getStoredProvidersAsync();
  const index = current.findIndex((p) => matchesProvider(p, provider.id) || matchesProvider(p, provider.name));
  if (index >= 0) {
    current[index] = { ...current[index], ...provider };
  } else {
    current.unshift(provider);
  }
  await saveStoredProvidersAsync(current);
  return current;
}

export async function deleteStoredProvider(id: string): Promise<StoredProvider[]> {
  const current = await getStoredProvidersAsync();
  const filtered = current.filter((p) => !matchesProvider(p, id));
  await saveStoredProvidersAsync(filtered);
  return filtered;
}

export async function toggleStoredProvider(id: string): Promise<StoredProvider[]> {
  const current = await getStoredProvidersAsync();
  const updated = current.map((p) => {
    if (matchesProvider(p, id)) {
      return { ...p, active: !p.active };
    }
    return p;
  });
  await saveStoredProvidersAsync(updated);
  return updated;
}
