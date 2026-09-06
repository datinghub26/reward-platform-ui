import fs from "fs";
import path from "path";

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

const STREAKS_CONFIG_FILE = path.join(process.cwd(), "data", "streaks-config.json");

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
  try {
    if (fs.existsSync(STREAKS_CONFIG_FILE)) {
      const raw = fs.readFileSync(STREAKS_CONFIG_FILE, "utf8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw);
      if (Array.isArray(data.streakDays)) {
        return data;
      }
    }
  } catch (err) {
    console.error("Error reading streaks-config.json:", err);
  }

  return {
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
}

export function saveStreaksConfig(config: StreaksConfig): boolean {
  try {
    const dir = path.dirname(STREAKS_CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STREAKS_CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
    triggerRevalidation();
    return true;
  } catch (err) {
    console.error("Error saving streaks-config.json:", err);
    return false;
  }
}

export interface UserStreakData {
  currentStreak: number;
  lastClaimDate: string | null;
  totalStreaksClaimed: number;
}

const USER_STREAKS_FILE = path.join(process.cwd(), "data", "user-streaks.json");

function getAllUserStreaks(): Record<string, UserStreakData> {
  try {
    if (fs.existsSync(USER_STREAKS_FILE)) {
      const raw = fs.readFileSync(USER_STREAKS_FILE, "utf8").replace(/^\uFEFF/, "");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading user-streaks.json:", err);
  }
  return {};
}

function saveAllUserStreaks(data: Record<string, UserStreakData>): boolean {
  try {
    const dir = path.dirname(USER_STREAKS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USER_STREAKS_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error saving user-streaks.json:", err);
    return false;
  }
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

  saveAllUserStreaks(all);
  triggerRevalidation();

  return {
    success: true,
    newStreak,
    rewardPoints: status.rewardPoints,
  };
}

