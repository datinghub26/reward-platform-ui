import fs from "fs";
import path from "path";
import { OffersPlatformConfig, DEFAULT_OFFERS_CONFIG, ProviderNetworkConfig } from "./offers-config-types";
import { getStoredProviders, saveStoredProviders } from "./providers-store";

const CONFIG_FILE = path.join(process.cwd(), "data", "offers-config.json");

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
    let currentConfig: OffersPlatformConfig;

    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, "");
      currentConfig = JSON.parse(raw);
    } else {
      currentConfig = JSON.parse(JSON.stringify(DEFAULT_OFFERS_CONFIG));
    }

    // Ensure providerConfigs exists
    if (!currentConfig.providerConfigs) {
      currentConfig.providerConfigs = {};
    }

    // Dynamically sync with actual providers in data/providers.json
    const liveProviders = getStoredProviders();
    for (const prov of liveProviders) {
      const existing = currentConfig.providerConfigs[prov.id];
      if (!existing) {
        currentConfig.providerConfigs[prov.id] = {
          name: prov.name,
          apiKey: "",
          secret: "",
          active: prov.active,
        };
      } else {
        // Sync name and active status
        existing.name = prov.name;
        existing.active = prov.active;
      }
    }

    return currentConfig;
  } catch (err) {
    console.error("Error reading offers-config.json:", err);
    return DEFAULT_OFFERS_CONFIG;
  }
}

export function saveOffersConfig(config: OffersPlatformConfig): boolean {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");

    // Also synchronize active state back to data/providers.json
    const liveProviders = getStoredProviders();
    let providersUpdated = false;

    for (const prov of liveProviders) {
      const conf = config.providerConfigs[prov.id];
      if (conf !== undefined && prov.active !== conf.active) {
        prov.active = conf.active;
        providersUpdated = true;
      }
    }

    if (providersUpdated) {
      saveStoredProviders(liveProviders);
    }

    triggerRevalidation();
    return true;
  } catch (err) {
    console.error("Error writing offers-config.json:", err);
    return false;
  }
}
