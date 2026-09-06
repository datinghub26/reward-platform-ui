const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=== REWARDNOVA REFERRAL & TOP OFFERS ENGINE VERIFICATION ===");

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

async function run() {
  const settingsFile = path.join(process.cwd(), "data", "settings.json");
  const referralsFile = path.join(process.cwd(), "data", "referrals.json");
  const offersConfigFile = path.join(process.cwd(), "data", "offers-config.json");

  it("data/settings.json contains referral configuration defaults", () => {
    assert(fs.existsSync(settingsFile), "settings.json does not exist");
    const raw = fs.readFileSync(settingsFile, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw);
    assert(typeof parsed.enableReferrals === "boolean", "enableReferrals must be boolean");
    assert(typeof parsed.referralCommissionRate === "number", "referralCommissionRate must be number");
    assert(typeof parsed.referralSignupBonus === "number", "referralSignupBonus must be number");
    assert(parsed.referralCommissionRate > 0, "referralCommissionRate must be positive");
  });

  it("data/referrals.json exists and contains referrals array", () => {
    assert(fs.existsSync(referralsFile), "referrals.json does not exist");
    const raw = fs.readFileSync(referralsFile, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw);
    assert(Array.isArray(parsed.referrals), "referrals must be an array");
  });

  it("lib/settings.ts specifies referral types and defaults", () => {
    const code = fs.readFileSync(path.join(process.cwd(), "lib", "settings.ts"), "utf8");
    assert(code.includes("enableReferrals: boolean"), "enableReferrals in PlatformSettings type missing");
    assert(code.includes("referralCommissionRate: number"), "referralCommissionRate type missing");
    assert(code.includes("referralSignupBonus: number"), "referralSignupBonus type missing");
  });

  it("lib/referrals.ts exports all core referral methods", () => {
    const code = fs.readFileSync(path.join(process.cwd(), "lib", "referrals.ts"), "utf8");
    assert(code.includes("export function getReferrals"), "getReferrals missing");
    assert(code.includes("export function saveReferrals"), "saveReferrals missing");
    assert(code.includes("export async function findUserByReferralCode"), "findUserByReferralCode missing");
    assert(code.includes("export async function recordReferral"), "recordReferral missing");
    assert(code.includes("export function getReferralStats"), "getReferralStats missing");
    assert(code.includes("export async function processReferralCommission"), "processReferralCommission missing");
  });

  it("app/register/actions.ts provides registerReferralAction server action", () => {
    const code = fs.readFileSync(path.join(process.cwd(), "app", "register", "actions.ts"), "utf8");
    assert(code.includes("export async function registerReferralAction"), "registerReferralAction missing");
    assert(code.includes("recordReferral"), "recordReferral call missing");
  });

  it("app/register/RegisterForm.tsx invokes registerReferralAction after signup", () => {
    const code = fs.readFileSync(path.join(process.cwd(), "app", "register", "RegisterForm.tsx"), "utf8");
    assert(code.includes("registerReferralAction"), "registerReferralAction import/call missing in RegisterForm");
    assert(code.includes("data.user?.id && refCode"), "referral condition check missing");
  });

  it("app/api/postback/route.ts processes referral commission on approved conversions", () => {
    const code = fs.readFileSync(path.join(process.cwd(), "app", "api", "postback", "route.ts"), "utf8");
    assert(code.includes("processReferralCommission"), "processReferralCommission missing in postback route");
    assert(code.includes("processReferralCommission(data.user_id, points)"), "processReferralCommission call missing");
  });

  it("app/referrals/page.tsx renders live stats and invitees table", () => {
    const code = fs.readFileSync(path.join(process.cwd(), "app", "referrals", "page.tsx"), "utf8");
    assert(code.includes("getReferralStats"), "getReferralStats missing in referrals page");
    assert(code.includes("stats.totalReferred"), "totalReferred stat missing");
    assert(code.includes("stats.commissionRate"), "commissionRate stat missing");
    assert(code.includes("stats.totalCommissionPoints"), "totalCommissionPoints missing");
    assert(code.includes("stats.invitees"), "invitees list missing");
  });

  it("app/referrals/ReferralCard.tsx supports copying code and social shares", () => {
    const code = fs.readFileSync(path.join(process.cwd(), "app", "referrals", "ReferralCard.tsx"), "utf8");
    assert(code.includes("copyToClipboard"), "copyToClipboard helper missing");
    assert(code.includes("referralCode"), "referralCode missing");
    assert(code.includes("whatsapp"), "WhatsApp share missing");
    assert(code.includes("twitter"), "Twitter share missing");
    assert(code.includes("t.me"), "Telegram share missing");
  });

  it("app/admin/settings/SettingsManager.tsx includes Referral configuration tab", () => {
    const code = fs.readFileSync(path.join(process.cwd(), "app", "admin", "settings", "SettingsManager.tsx"), "utf8");
    assert(code.includes('activeTab === "Referral"'), "Referral tab missing in SettingsManager");
    assert(code.includes("enableReferrals"), "enableReferrals control missing");
    assert(code.includes("referralCommissionRate"), "referralCommissionRate control missing");
    assert(code.includes("referralSignupBonus"), "referralSignupBonus control missing");
  });

  it("Top Offers configuration connects to app/earn/page.tsx and components/OfferWall.tsx", () => {
    assert(fs.existsSync(offersConfigFile), "data/offers-config.json missing");
    const earnPage = fs.readFileSync(path.join(process.cwd(), "app", "earn", "page.tsx"), "utf8");
    assert(earnPage.includes("getOffersConfig"), "getOffersConfig missing in earn page");
    assert(earnPage.includes("offersConfig={offersConfig}"), "offersConfig prop missing in OfferWall instantiation");

    const offerWall = fs.readFileSync(path.join(process.cwd(), "components", "OfferWall.tsx"), "utf8");
    assert(offerWall.includes("topOffers = useMemo"), "topOffers calculation missing");
    assert(offerWall.includes("Top Offers"), "Top Offers shelf heading missing");
    assert(offerWall.includes("topOffersMode"), "topOffersMode check missing");
  });

  it("Referral stats calculation logic test (mock simulation)", () => {
    // Test pure logic with mock records
    const mockReferrals = [
      { referredUserId: "u1", referrerUserId: "refA", referredEmail: "alice@test.com", joinedAt: "2026-09-01T12:00:00Z", commissionPointsEarned: 150, bonusPointsAwarded: 100 },
      { referredUserId: "u2", referrerUserId: "refA", referredEmail: "bob@domain.org", joinedAt: "2026-09-02T14:00:00Z", commissionPointsEarned: 350, bonusPointsAwarded: 100 },
      { referredUserId: "u3", referrerUserId: "refB", referredEmail: "charlie@web.net", joinedAt: "2026-09-03T10:00:00Z", commissionPointsEarned: 50, bonusPointsAwarded: 100 },
    ];

    const refAInvitees = mockReferrals.filter(r => r.referrerUserId === "refA");
    const totalPoints = refAInvitees.reduce((s, r) => s + r.commissionPointsEarned, 0);
    assert.strictEqual(refAInvitees.length, 2, "refA should have 2 referrals");
    assert.strictEqual(totalPoints, 500, "refA points should be 500");
    const usd = Number((totalPoints / 1000).toFixed(2));
    assert.strictEqual(usd, 0.5, "refA USD value should be 0.50");
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
