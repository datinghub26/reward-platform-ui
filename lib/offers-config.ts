import { OffersPlatformConfig, DEFAULT_OFFERS_CONFIG } from "./offers-config-types";
import { getStoredProvidersAsync, saveStoredProvidersAsync, getStoredProviders } from "./providers-store";
import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

const CONFIG_KEY = "offers_config";
const FALLBACK_FILE = "offers-config.json";

function triggerRevalidation() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/admin/offers-settings");
    revalidatePath("/admin/providers");
    revalidatePath("/earn");
  } catch {
    // No-op in script context
  }
}

export function getOffersConfig(): OffersPlatformConfig {
  try {
    const currentConfig = getLocalFallbackConfig<OffersPlatformConfig>(
      FALLBACK_FILE,
      JSON.parse(JSON.stringify(DEFAULT_OFFERS_CONFIG))
    );

    if (!currentConfig.providerConfigs) {
      currentConfig.providerConfigs = {};
    }

    const liveProviders = getStoredProviders();
    const { matchesProvider } = require("./providers-store");

    for (const prov of liveProviders) {
      const existingKey = Object.keys(currentConfig.providerConfigs).find(
        (key) => key === prov.id || matchesProvider(prov, key)
      );

      if (!existingKey) {
        currentConfig.providerConfigs[prov.id] = {
          name: prov.name,
          apiKey: "",
          secret: "",
          active: prov.active,
        };
      } else {
        const existing = currentConfig.providerConfigs[existingKey];
        if (existingKey !== prov.id) {
          delete currentConfig.providerConfigs[existingKey];
          currentConfig.providerConfigs[prov.id] = {
            ...existing,
            name: prov.name,
            active: prov.active,
          };
        } else {
          existing.name = prov.name;
          existing.active = prov.active;
        }
      }
    }

    // Clean up provider tabs that no longer exist in live providers
    for (const key of Object.keys(currentConfig.providerConfigs)) {
      const existsInLive = liveProviders.some(
        (prov) => prov.id === key || matchesProvider(prov, key)
      );
      if (!existsInLive) {
        delete currentConfig.providerConfigs[key];
      }
    }

    return currentConfig;
  } catch (err) {
    console.error("Error reading offers config:", err);
    return DEFAULT_OFFERS_CONFIG;
  }
}

export async function getOffersConfigAsync(): Promise<OffersPlatformConfig> {
  try {
    const fallback = getOffersConfig();
    const currentConfig = await getSystemConfig<OffersPlatformConfig>(CONFIG_KEY, FALLBACK_FILE, fallback);

    if (!currentConfig.providerConfigs) {
      currentConfig.providerConfigs = {};
    }

    const { matchesProvider } = await import("./providers-store");
    const liveProviders = await getStoredProvidersAsync();

    for (const prov of liveProviders) {
      const existingKey = Object.keys(currentConfig.providerConfigs).find(
        (key) => key === prov.id || matchesProvider(prov, key)
      );

      if (!existingKey) {
        currentConfig.providerConfigs[prov.id] = {
          name: prov.name,
          apiKey: "",
          secret: "",
          active: prov.active,
        };
      } else {
        const existing = currentConfig.providerConfigs[existingKey];
        if (existingKey !== prov.id) {
          delete currentConfig.providerConfigs[existingKey];
          currentConfig.providerConfigs[prov.id] = {
            ...existing,
            name: prov.name,
            active: prov.active,
          };
        } else {
          existing.name = prov.name;
          existing.active = prov.active;
        }
      }
    }

    // Clean up provider tabs that no longer exist in live providers
    for (const key of Object.keys(currentConfig.providerConfigs)) {
      const existsInLive = liveProviders.some(
        (prov) => prov.id === key || matchesProvider(prov, key)
      );
      if (!existsInLive) {
        delete currentConfig.providerConfigs[key];
      }
    }

    return currentConfig;
  } catch (err) {
    console.error("Error loading offers config async:", err);
    return DEFAULT_OFFERS_CONFIG;
  }
}

export async function syncProvidersWithOffersConfigAsync(): Promise<OffersPlatformConfig> {
  const config = await getOffersConfigAsync();
  await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, config);
  triggerRevalidation();
  return config;
}

export async function saveOffersConfigAsync(config: OffersPlatformConfig): Promise<boolean> {
  try {
    await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, config);

    // Also synchronize active state back to stored providers
    const liveProviders = await getStoredProvidersAsync();
    let providersUpdated = false;

    for (const prov of liveProviders) {
      const conf = config.providerConfigs[prov.id];
      if (conf !== undefined && prov.active !== conf.active) {
        prov.active = conf.active;
        providersUpdated = true;
      }
    }

    if (providersUpdated) {
      await saveStoredProvidersAsync(liveProviders);
    }

    triggerRevalidation();
    return true;
  } catch (err) {
    console.error("Error saving offers config:", err);
    return false;
  }
}

export function saveOffersConfig(config: OffersPlatformConfig): boolean {
  saveOffersConfigAsync(config).catch((e) => console.error("Async saveOffersConfig error:", e));
  return true;
}
