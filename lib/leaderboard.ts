import fs from "fs";
import path from "path";

export interface PrizeTier {
  rank: number;
  rewardPoints: number;
  title: string;
}

export interface LeaderboardConfig {
  prizePoolEnabled: boolean;
  resetFrequency: "monthly" | "weekly" | "biweekly";
  lastResetDate: string;
  totalPrizePoints: number;
  prizes: PrizeTier[];
}

const LEADERBOARD_CONFIG_FILE = path.join(process.cwd(), "data", "leaderboard-config.json");

function triggerRevalidation() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    revalidatePath("/admin/ranks");
    revalidatePath("/leaderboard");
  } catch {
    // No-op in non-Next.js runtime
  }
}

export function getLeaderboardConfig(): LeaderboardConfig {
  try {
    if (fs.existsSync(LEADERBOARD_CONFIG_FILE)) {
      const raw = fs.readFileSync(LEADERBOARD_CONFIG_FILE, "utf8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw);
      if (Array.isArray(data.prizes)) {
        return data;
      }
    }
  } catch (err) {
    console.error("Error reading leaderboard-config.json:", err);
  }

  return {
    prizePoolEnabled: true,
    resetFrequency: "monthly",
    lastResetDate: new Date().toISOString(),
    totalPrizePoints: 105000,
    prizes: [
      { rank: 1, rewardPoints: 50000, title: "Champion Trophy" },
      { rank: 2, rewardPoints: 25000, title: "Runner-Up Silver" },
      { rank: 3, rewardPoints: 15000, title: "Bronze Medal" },
    ],
  };
}

export function saveLeaderboardConfig(config: LeaderboardConfig): boolean {
  try {
    const totalPrizePoints = config.prizes.reduce(
      (sum, p) => sum + (Number(p.rewardPoints) || 0),
      0
    );
    const updated: LeaderboardConfig = {
      ...config,
      totalPrizePoints,
    };

    const dir = path.dirname(LEADERBOARD_CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LEADERBOARD_CONFIG_FILE, JSON.stringify(updated, null, 2), "utf8");
    triggerRevalidation();
    return true;
  } catch (err) {
    console.error("Error saving leaderboard-config.json:", err);
    return false;
  }
}
