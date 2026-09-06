import fs from "fs";
import path from "path";

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

const DATA_FILE = path.join(process.cwd(), "data", "providers.json");

function triggerRevalidation() {
  try {
    // Dynamically require next/cache so it doesn't break in standalone script runtimes
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/admin/providers");
    revalidatePath("/earn");
  } catch {
    // No-op when invoked outside a Next.js server request
  }
}

export function matchesProvider(p: StoredProvider, identifier: string): boolean {
  if (!identifier) return false;
  const cleanTarget = identifier.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanId = (p.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanName = (p.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  return p.id === identifier || cleanId === cleanTarget || cleanName === cleanTarget;
}

export function getStoredProviders(): StoredProvider[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading providers.json:", err);
    return [];
  }
}

export function saveStoredProviders(providers: StoredProvider[]): boolean {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(providers, null, 2), "utf8");
    triggerRevalidation();
    return true;
  } catch (err) {
    console.error("Error writing providers.json:", err);
    return false;
  }
}

export function addOrUpdateProvider(provider: StoredProvider): StoredProvider[] {
  const current = getStoredProviders();
  const index = current.findIndex((p) => matchesProvider(p, provider.id) || matchesProvider(p, provider.name));
  if (index >= 0) {
    current[index] = { ...current[index], ...provider };
  } else {
    current.unshift(provider);
  }
  saveStoredProviders(current);
  return current;
}

export function deleteStoredProvider(id: string): StoredProvider[] {
  const current = getStoredProviders();
  const filtered = current.filter((p) => !matchesProvider(p, id));
  saveStoredProviders(filtered);
  return filtered;
}

export function toggleStoredProvider(id: string): StoredProvider[] {
  const current = getStoredProviders();
  const updated = current.map((p) => {
    if (matchesProvider(p, id)) {
      return { ...p, active: !p.active };
    }
    return p;
  });
  saveStoredProviders(updated);
  return updated;
}
