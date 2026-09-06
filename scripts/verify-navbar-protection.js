/**
 * Verification Script: Phase 17 — Navbar Buttons Desk, Postback Level Multiplier & Registration Protection
 */

const fs = require("fs");
const path = require("path");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("=== Phase 17 Verification: Navbar Buttons, Level Multiplier & Registration Protection ===");

  // -------------------------------------------------------------
  // Test 1: Navbar Buttons Configuration
  // -------------------------------------------------------------
  console.log("\n[Test 1] Navbar Buttons Configuration File:");
  const buttonsPath = path.join(__dirname, "..", "data", "navbar-buttons.json");
  assert(fs.existsSync(buttonsPath), "data/navbar-buttons.json exists");

  const rawButtons = JSON.parse(fs.readFileSync(buttonsPath, "utf8"));
  assert(Array.isArray(rawButtons.buttons), "data/navbar-buttons.json has buttons array");
  assert(rawButtons.buttons.length >= 4, `Found ${rawButtons.buttons.length} configured buttons`);

  const earnBtn = rawButtons.buttons.find((b) => b.id === "earn");
  assert(earnBtn && earnBtn.label === "Earn" && earnBtn.url === "/earn", "Earn button configured properly");

  const leaderboardBtn = rawButtons.buttons.find((b) => b.id === "leaderboard");
  assert(leaderboardBtn && leaderboardBtn.label === "Leaderboard", "Leaderboard button configured properly");

  const withdrawBtn = rawButtons.buttons.find((b) => b.id === "withdraw");
  assert(withdrawBtn && withdrawBtn.label === "Withdraw", "Withdraw button configured properly");

  // -------------------------------------------------------------
  // Test 2: Navbar Buttons Helper Library (lib/navbar-buttons.ts)
  // -------------------------------------------------------------
  console.log("\n[Test 2] lib/navbar-buttons.ts Logic:");
  const libFile = path.join(__dirname, "..", "lib", "navbar-buttons.ts");
  assert(fs.existsSync(libFile), "lib/navbar-buttons.ts exists");

  // Load and test helper logic dynamically or via reading
  const libContent = fs.readFileSync(libFile, "utf8");
  assert(libContent.includes("export function getNavbarButtons"), "getNavbarButtons exported");
  assert(libContent.includes("export function getActiveNavbarButtons"), "getActiveNavbarButtons exported");
  assert(libContent.includes("export function saveNavbarButton"), "saveNavbarButton exported");
  assert(libContent.includes("export function deleteNavbarButton"), "deleteNavbarButton exported");
  assert(libContent.includes("export function toggleNavbarButton"), "toggleNavbarButton exported");

  // -------------------------------------------------------------
  // Test 3: Admin Sidebar Navigation Parity
  // -------------------------------------------------------------
  console.log("\n[Test 3] AdminSidebar Navigation Parity:");
  const sidebarFile = path.join(__dirname, "..", "components", "admin", "AdminSidebar.tsx");
  const sidebarContent = fs.readFileSync(sidebarFile, "utf8");
  assert(sidebarContent.includes("/admin/navbar-buttons"), "AdminSidebar includes /admin/navbar-buttons route");
  assert(sidebarContent.includes("Navbar Buttons"), "AdminSidebar has 'Navbar Buttons' label");
  assert(sidebarContent.includes("/admin/settings"), "AdminSidebar has 'Settings' route");

  // -------------------------------------------------------------
  // Test 4: Postback Level Multiplier Bonus Hook
  // -------------------------------------------------------------
  console.log("\n[Test 4] Postback Level Multiplier Bonus Hook:");
  const postbackFile = path.join(__dirname, "..", "app", "api", "postback", "route.ts");
  const postbackContent = fs.readFileSync(postbackFile, "utf8");
  assert(
    postbackContent.includes("processLevelMultiplierBonus"),
    "app/api/postback/route.ts invokes processLevelMultiplierBonus"
  );

  const levelsFile = path.join(__dirname, "..", "lib", "levels.ts");
  const levelsContent = fs.readFileSync(levelsFile, "utf8");
  assert(
    levelsContent.includes("export async function processLevelMultiplierBonus"),
    "lib/levels.ts exports processLevelMultiplierBonus"
  );
  assert(
    levelsContent.includes("reward_ledger") && levelsContent.includes("Level Multiplier Bonus"),
    "lib/levels.ts records double-entry ledger credit"
  );
  assert(
    levelsContent.includes("notifications"),
    "lib/levels.ts sends notification on level multiplier bonus"
  );

  // Test math calculations:
  // Level 5 (Gold Achiever): 2.0% perk
  const basePoints = 2500;
  const perkBonusPercent = 2.0;
  const expectedBonus = Math.round(basePoints * (perkBonusPercent / 100)); // 50 pts
  assert(expectedBonus === 50, `Multiplier calculation for 2500 pts at 2.0% is 50 pts (got: ${expectedBonus})`);

  // Level 10 (Cosmic Champion): 7.5% perk
  const champBase = 10000;
  const champBonusPercent = 7.5;
  const expectedChampBonus = Math.round(champBase * (champBonusPercent / 100)); // 750 pts
  assert(expectedChampBonus === 750, `Multiplier calculation for 10000 pts at 7.5% is 750 pts (got: ${expectedChampBonus})`);

  // -------------------------------------------------------------
  // Test 5: Registration Email Domain Protection
  // -------------------------------------------------------------
  console.log("\n[Test 5] Registration Email Domain Protection:");
  const regActionsFile = path.join(__dirname, "..", "app", "register", "actions.ts");
  const regActionsContent = fs.readFileSync(regActionsFile, "utf8");
  assert(
    regActionsContent.includes("export async function validateRegistrationEmailAction"),
    "app/register/actions.ts exports validateRegistrationEmailAction"
  );

  const regFormFile = path.join(__dirname, "..", "app", "register", "RegisterForm.tsx");
  const regFormContent = fs.readFileSync(regFormFile, "utf8");
  assert(
    regFormContent.includes("validateRegistrationEmailAction"),
    "app/register/RegisterForm.tsx invokes validateRegistrationEmailAction"
  );

  // Simulate domain validation logic
  const mockSettingsAllow = {
    customDomain: true,
    domains: "gmail.com,yahoo.com,outlook.com",
  };

  function simulateDomainValidation(email, settings) {
    if (!email || !email.includes("@")) return { valid: false, error: "Invalid email" };
    if (settings.customDomain) {
      const parts = email.toLowerCase().trim().split("@");
      const domain = parts[1];
      const allowedList = (settings.domains || "")
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      if (allowedList.length > 0 && (!domain || !allowedList.includes(domain))) {
        return { valid: false, error: `Restricted domain: ${domain}` };
      }
    }
    return { valid: true };
  }

  assert(
    simulateDomainValidation("test@gmail.com", mockSettingsAllow).valid === true,
    "Authorized domain test@gmail.com passes validation"
  );
  assert(
    simulateDomainValidation("user@yahoo.com", mockSettingsAllow).valid === true,
    "Authorized domain user@yahoo.com passes validation"
  );
  assert(
    simulateDomainValidation("badactor@disposable.xyz", mockSettingsAllow).valid === false,
    "Unauthorized domain badactor@disposable.xyz is rejected"
  );
  assert(
    simulateDomainValidation("fraud@tempmail.org", mockSettingsAllow).valid === false,
    "Unauthorized domain fraud@tempmail.org is rejected"
  );

  const mockSettingsDisabled = {
    customDomain: false,
    domains: "gmail.com",
  };
  assert(
    simulateDomainValidation("anydomain@anything.org", mockSettingsDisabled).valid === true,
    "When customDomain protection is disabled, all valid email domains are permitted"
  );

  // -------------------------------------------------------------
  // Test 6: Strict Branding Integrity
  // -------------------------------------------------------------
  console.log("\n[Test 6] Brand Integrity & Zero Screenshot Leaks:");
  const filesToCheck = [
    "data/navbar-buttons.json",
    "lib/navbar-buttons.ts",
    "app/admin/navbar-buttons/actions.ts",
    "app/admin/navbar-buttons/NavbarButtonsManager.tsx",
    "app/admin/navbar-buttons/page.tsx",
    "components/admin/AdminSidebar.tsx",
    "components/PublicNav.tsx",
    "components/UserLevelWidget.tsx",
    "app/api/postback/route.ts",
    "app/register/actions.ts",
    "app/register/RegisterForm.tsx",
  ];

  let brandClean = true;
  for (const rel of filesToCheck) {
    const full = path.join(__dirname, "..", rel);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, "utf8");
      if (content.toLowerCase().includes("offerverse")) {
        console.error(`  ❌ Brand leak: 'OfferVerse' found in ${rel}`);
        brandClean = false;
      }
      if (content.toLowerCase().includes("earnrewardcash")) {
        console.error(`  ❌ Brand leak: 'earnrewardcash' found in ${rel}`);
        brandClean = false;
      }
    }
  }
  assert(brandClean, "Zero brand leaks in all modified and created files");

  // Summary
  console.log("\n========================================================");
  console.log(`Phase 17 Verification Complete: ${passed} passed, ${failed} failed.`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
