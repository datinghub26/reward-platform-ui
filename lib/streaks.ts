import { getSystemConfig, setSystemConfig, getLocalFallbackConfig } from "./system-config";

export interface StreakDay {
  day: number;
  bonusPoints: number;
  title: string;
}

export interface StreaksConfig {
  enabled: boolean;
  minDailyPoints: number;
  maxStreakFreeze: number;
  streakDays: StreakDay[];
}

const CONFIG_KEY = "streaks_config";
const FALLBACK_FILE = "streaks-config.json";
const USER_STREAKS_KEY = "user_streaks";
const USER_STREAKS_FILE = "user-streaks.json";

export const DEFAULT_STREAKS_CONFIG: StreaksConfig = {
  enabled: true,
  minDailyPoints: 50,
  maxStreakFreeze: 1,
  streakDays: [
    { day: 1, bonusPoints: 10, title: "Day 1 Kickoff" },
    { day: 2, bonusPoints: 25, title: "Day 2 Momentum" },
    { day: 3, bonusPoints: 50, title: "Day 3 Consistency" },
    { day: 4, bonusPoints: 75, title: "Day 4 Unstoppable" },
    { day: 5, bonusPoints: 100, title: "Day 5 High Roller" },
    { day: 6, bonusPoints: 150, title: "Day 6 Master" },
    { day: 7, bonusPoints: 250, title: "Day 7 Jackpot Nova" },
  ],
};

function triggerRevalidation() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/admin/streaks");
    revalidatePath("/dashboard");
  } catch {
    // No-op in non-Next.js runtime
  }
}

export function getStreaksConfig(): StreaksConfig {
  const data = getLocalFallbackConfig<StreaksConfig>(FALLBACK_FILE, DEFAULT_STREAKS_CONFIG, CONFIG_KEY);
  if (Array.isArray(data.streakDays)) {
    return data;
  }
  return DEFAULT_STREAKS_CONFIG;
}

export async function getStreaksConfigAsync(): Promise<StreaksConfig> {
  const fallback = getStreaksConfig();
  const data = await getSystemConfig<StreaksConfig>(CONFIG_KEY, FALLBACK_FILE, fallback);
  if (Array.isArray(data.streakDays)) {
    return data;
  }
  return DEFAULT_STREAKS_CONFIG;
}

export async function saveStreaksConfigAsync(config: StreaksConfig): Promise<boolean> {
  try {
    const ok = await setSystemConfig(CONFIG_KEY, FALLBACK_FILE, config);
    triggerRevalidation();
    return ok;
  } catch (err) {
    console.error("Error saving streaks config:", err);
    return false;
  }
}

export function saveStreaksConfig(config: StreaksConfig): boolean {
  saveStreaksConfigAsync(config).catch((e) => console.error("Async saveStreaksConfig error:", e));
  return true;
}

export interface UserStreakData {
  currentStreak: number;
  lastClaimDate: string | null;
  totalStreaksClaimed: number;
}

function getAllUserStreaks(): Record<string, UserStreakData> {
  return getLocalFallbackConfig<Record<string, UserStreakData>>(USER_STREAKS_FILE, {}, USER_STREAKS_KEY);
}

async function getAllUserStreaksAsync(): Promise<Record<string, UserStreakData>> {
  const fallback = getAllUserStreaks();
  return getSystemConfig<Record<string, UserStreakData>>(USER_STREAKS_KEY, USER_STREAKS_FILE, fallback);
}

async function saveAllUserStreaksAsync(data: Record<string, UserStreakData>): Promise<boolean> {
  return setSystemConfig(USER_STREAKS_KEY, USER_STREAKS_FILE, data);
}

export function getUserStreakStatus(userId: string): {
  currentStreak: number;
  targetDay: number;
  canClaimToday: boolean;
  alreadyClaimedToday: boolean;
  rewardPoints: number;
  lastClaimDate: string | null;
  totalStreaksClaimed: number;
} {
  const all = getAllUserStreaks();
  const userRecord = all[userId] || {
    currentStreak: 0,
    lastClaimDate: null,
    totalStreaksClaimed: 0,
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const config = getStreaksConfig();
  const schedule = config.streakDays;

  const alreadyClaimedToday = userRecord.lastClaimDate === todayStr;

  let targetDay = 1;
  if (userRecord.lastClaimDate === yesterdayStr) {
    targetDay = (userRecord.currentStreak % 7) + 1;
  } else if (alreadyClaimedToday) {
    targetDay = userRecord.currentStreak || 1;
  } else {
    // Missed a day or brand new
    targetDay = 1;
  }

  const dayConfig = schedule.find((d) => d.day === targetDay) || schedule[0];
  const rewardPoints = dayConfig ? dayConfig.bonusPoints : 10;

  return {
    currentStreak: userRecord.currentStreak,
    targetDay,
    canClaimToday: !alreadyClaimedToday && config.enabled,
    alreadyClaimedToday,
    rewardPoints,
    lastClaimDate: userRecord.lastClaimDate,
    totalStreaksClaimed: userRecord.totalStreaksClaimed,
  };
}

export async function getUserStreakStatusAsync(userId: string) {
  const all = await getAllUserStreaksAsync();
  const userRecord = all[userId] || {
    currentStreak: 0,
    lastClaimDate: null,
    totalStreaksClaimed: 0,
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const config = await getStreaksConfigAsync();
  const schedule = config.streakDays;

  const alreadyClaimedToday = userRecord.lastClaimDate === todayStr;

  let targetDay = 1;
  if (userRecord.lastClaimDate === yesterdayStr) {
    targetDay = (userRecord.currentStreak % 7) + 1;
  } else if (alreadyClaimedToday) {
    targetDay = userRecord.currentStreak || 1;
  } else {
    targetDay = 1;
  }

  const dayConfig = schedule.find((d) => d.day === targetDay) || schedule[0];
  const rewardPoints = dayConfig ? dayConfig.bonusPoints : 10;

  return {
    currentStreak: userRecord.currentStreak,
    targetDay,
    canClaimToday: !alreadyClaimedToday && config.enabled,
    alreadyClaimedToday,
    rewardPoints,
    lastClaimDate: userRecord.lastClaimDate,
    totalStreaksClaimed: userRecord.totalStreaksClaimed,
  };
}

export async function recordUserStreakClaimAsync(userId: string): Promise<{
  success: boolean;
  newStreak: number;
  rewardPoints: number;
  error?: string;
}> {
  const status = await getUserStreakStatusAsync(userId);
  if (!status.canClaimToday) {
    return {
      success: false,
      newStreak: status.currentStreak,
      rewardPoints: 0,
      error: status.alreadyClaimedToday
        ? "You have already claimed your daily streak bonus today!"
        : "Daily streak is currently unavailable.",
    };
  }

  const all = await getAllUserStreaksAsync();
  const todayStr = new Date().toISOString().split("T")[0];
  const newStreak = status.targetDay;

  all[userId] = {
    currentStreak: newStreak,
    lastClaimDate: todayStr,
    totalStreaksClaimed: (status.totalStreaksClaimed || 0) + 1,
  };

  await saveAllUserStreaksAsync(all);
  triggerRevalidation();

  return {
    success: true,
    newStreak,
    rewardPoints: status.rewardPoints,
  };
}

export function recordUserStreakClaim(userId: string): {
  success: boolean;
  newStreak: number;
  rewardPoints: number;
  error?: string;
} {
  const status = getUserStreakStatus(userId);
  if (!status.canClaimToday) {
    return {
      success: false,
      newStreak: status.currentStreak,
      rewardPoints: 0,
      error: status.alreadyClaimedToday
        ? "You have already claimed your daily streak bonus today!"
        : "Daily streak is currently unavailable.",
    };
  }

  const all = getAllUserStreaks();
  const todayStr = new Date().toISOString().split("T")[0];
  const newStreak = status.targetDay;

  all[userId] = {
    currentStreak: newStreak,
    lastClaimDate: todayStr,
    totalStreaksClaimed: (status.totalStreaksClaimed || 0) + 1,
  };

  saveAllUserStreaksAsync(all).catch((e) => console.error("Async save streaks claim error:", e));
  triggerRevalidation();

  return {
    success: true,
    newStreak,
    rewardPoints: status.rewardPoints,
  };
}
