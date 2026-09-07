import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

const CONFIG_KEY = "user_numeric_ids";
const FALLBACK_FILE = "user-numeric-ids.json";

export interface UserNumericIdMap {
  [userId: string]: number;
}

const DEFAULT_MAP: UserNumericIdMap = {
  "46637e5b-cf5f-40aa-8775-fd6c15baf10b": 1,
  "f24c9a10-0080-4a71-9229-b827ffd1b27c": 2,
  "1b072bd6-3113-4161-8951-e68274cdd6af": 3,
  "65108684-7012-4557-b009-f9fd0ce26188": 4,
  "23b40ecc-e29b-43db-bec7-b28f9df069cb": 5,
  "5ffefb55-2973-47cd-8ccd-7c78e92cd043": 6, // Main Admin Account
  "c420ea99-edef-4247-b637-9519c3ae2581": 7, // aam7366b
};

export async function getUserNumericIdMapAsync(): Promise<UserNumericIdMap> {
  const localDefault = getLocalFallbackConfig<UserNumericIdMap>(FALLBACK_FILE, DEFAULT_MAP, CONFIG_KEY);
  const config = await getSystemConfig<UserNumericIdMap>(CONFIG_KEY, FALLBACK_FILE, localDefault);
  return { ...DEFAULT_MAP, ...(config || {}) };
}

export async function getOrAssignUserNumericIdAsync(userId: string): Promise<number> {
  if (!userId) return 0;
  const map = await getUserNumericIdMapAsync();
  if (map[userId]) {
    return map[userId];
  }

  const existingNumbers = Object.values(map);
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  map[userId] = nextNumber;

  try {
    await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, map);
  } catch (e) {
    console.error("Failed to persist user numeric ID:", e);
  }

  return nextNumber;
}

export async function findUserIdByNumericIdAsync(numericId: number | string): Promise<string | null> {
  const target = Number(numericId);
  if (!Number.isFinite(target)) return null;

  const map = await getUserNumericIdMapAsync();
  for (const [uid, num] of Object.entries(map)) {
    if (num === target) return uid;
  }
  return null;
}
