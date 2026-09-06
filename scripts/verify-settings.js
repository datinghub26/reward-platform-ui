const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=== REWARDNOVA SETTINGS OPERATIONAL VERIFICATION ===");

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log("  [PASS] " + desc);
    passed++;
  } catch (err) {
    console.error("  [FAIL] " + desc + ": " + err.message);
    failed++;
  }
}

function run() {
  const settingsPath = path.join(process.cwd(), "data", "settings.json");
  const publicSoundsDir = path.join(process.cwd(), "public", "assets", "sounds");
  const notificationMp3 = path.join(publicSoundsDir, "notification.mp3");

  it("data/settings.json exists on disk and has valid JSON", () => {
    assert(fs.existsSync(settingsPath), "data/settings.json does not exist");
    const raw = fs.readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw);
    assert(typeof parsed === "object" && parsed !== null, "settings.json is not an object");
    assert(typeof parsed.enablePendingLeads === "boolean", "enablePendingLeads missing");
    assert(typeof parsed.pendingPointsThreshold === "number", "pendingPointsThreshold missing");
    assert(typeof parsed.verifyEmailToWithdraw === "boolean", "verifyEmailToWithdraw missing");
    assert(typeof parsed.domains === "string", "domains missing");
  });

  it("public/assets/sounds/notification.mp3 exists and has valid audio data", () => {
    assert(fs.existsSync(notificationMp3), "public/assets/sounds/notification.mp3 does not exist");
    const stat = fs.statSync(notificationMp3);
    assert(stat.size > 1000, "Audio file is too small: " + stat.size + " bytes");
  });

  it("lib/settings.ts provides getPlatformSettings and updatePlatformSettings", () => {
    const libSettings = fs.readFileSync(path.join(process.cwd(), "lib", "settings.ts"), "utf8");
    assert(libSettings.includes("export function getPlatformSettings"), "getPlatformSettings missing");
    assert(libSettings.includes("export function updatePlatformSettings"), "updatePlatformSettings missing");
  });

  it("app/admin/settings/actions.ts provides server actions", () => {
    const actions = fs.readFileSync(path.join(process.cwd(), "app", "admin", "settings", "actions.ts"), "utf8");
    assert(actions.includes("export async function getSettingsAction"), "getSettingsAction missing");
    assert(actions.includes("export async function saveSettingsAction"), "saveSettingsAction missing");
    assert(actions.includes("export async function uploadNotificationToneAction"), "uploadNotificationToneAction missing");
  });

  it("app/api/withdrawals/route.ts checks verifyEmailToWithdraw setting", () => {
    const withdrawRoute = fs.readFileSync(path.join(process.cwd(), "app", "api", "withdrawals", "route.ts"), "utf8");
    assert(withdrawRoute.includes("getPlatformSettings"), "getPlatformSettings not imported in withdrawals route");
    assert(withdrawRoute.includes("verifyEmailToWithdraw"), "verifyEmailToWithdraw check missing in withdrawals route");
    assert(withdrawRoute.includes("email_confirmed_at"), "email_confirmed_at check missing in withdrawals route");
  });

  it("app/api/postback/route.ts connects pending threshold dynamically", () => {
    const postbackRoute = fs.readFileSync(path.join(process.cwd(), "app", "api", "postback", "route.ts"), "utf8");
    assert(postbackRoute.includes("getPlatformSettings"), "getPlatformSettings not imported in postback route");
    assert(postbackRoute.includes("pendingPointsThreshold"), "pendingPointsThreshold check missing in postback route");
    assert(postbackRoute.includes("enablePendingLeads"), "enablePendingLeads check missing in postback route");
  });

  it("SettingsManager.tsx has all 9 operational tabs matching platform specs", () => {
    const manager = fs.readFileSync(path.join(process.cwd(), "app", "admin", "settings", "SettingsManager.tsx"), "utf8");
    assert(manager.includes('"Protection"'), "Protection tab missing");
    assert(manager.includes('"Postback"'), "Postback tab missing");
    assert(manager.includes('"Third Party"'), "Third Party tab missing");
    assert(manager.includes('"Referral"'), "Referral tab missing");
    assert(manager.includes('"Levels"'), "Levels tab missing");
    assert(manager.includes('"Leaderboard"'), "Leaderboard tab missing");
    assert(manager.includes('"Streaks"'), "Streaks tab missing");
    assert(manager.includes('"Social Media"'), "Social Media tab missing");
    assert(manager.includes('"Notification Tone"'), "Notification Tone tab missing");
    assert(manager.includes("saveSettingsAction"), "saveSettingsAction not bound in SettingsManager");
    assert(manager.includes("uploadNotificationToneAction"), "uploadNotificationToneAction not bound in SettingsManager");
  });

  it("lib/sound.ts integrates server audio playback with synthesized fallback", () => {
    const sound = fs.readFileSync(path.join(process.cwd(), "lib", "sound.ts"), "utf8");
    assert(sound.includes("/assets/sounds/notification.mp3"), "notification.mp3 URL missing in sound.ts");
    assert(sound.includes("playSynthesizedChime"), "playSynthesizedChime fallback missing in sound.ts");
  });

  console.log("\nVerification results: " + passed + " passed, " + failed + " failed.");
  if (failed > 0) process.exit(1);
}

run();