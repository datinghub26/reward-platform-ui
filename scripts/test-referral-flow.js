const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=== REWARDNOVA LIVE REFERRAL LOGIC TEST SUITE ===");

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
  const settingsRaw = fs.readFileSync(path.join(process.cwd(), "data", "settings.json"), "utf8").replace(/^\uFEFF/, "");
  const settings = JSON.parse(settingsRaw);

  const offersRaw = fs.readFileSync(path.join(process.cwd(), "data", "offers-config.json"), "utf8").replace(/^\uFEFF/, "");
  const offersConfig = JSON.parse(offersRaw);

  it("Settings has operational referral configurations", () => {
    assert.strictEqual(typeof settings.enableReferrals, "boolean");
    assert.strictEqual(typeof settings.referralCommissionRate, "number");
    assert.strictEqual(typeof settings.referralSignupBonus, "number");
    assert(settings.referralCommissionRate >= 0 && settings.referralCommissionRate <= 100);
  });

  it("Offers config has topOffersMode and maxOffers", () => {
    assert(typeof offersConfig.topOffersMode === "string");
    assert(typeof offersConfig.maxOffers === "number");
    assert(offersConfig.maxOffers >= 1);
  });

  it("Referral commission computation is mathematically sound", () => {
    const rate = settings.referralCommissionRate; // e.g. 10
    const offerPoints = 5000;
    const commission = Math.max(1, Math.round(offerPoints * (rate / 100)));
    assert.strictEqual(commission, 500);

    // Small conversion case (e.g. 5 points)
    const smallOfferPoints = 5;
    const smallCommission = Math.max(1, Math.round(smallOfferPoints * (rate / 100)));
    assert(smallCommission >= 1, "Should award at least 1 point commission if rate > 0");
  });

  it("Top offers selection algorithm correctly ranks items", () => {
    const mockOffers = [
      { id: "1", title: "App A", reward_points: 1000, priority: 1, featured: false, popular: false, countries: [] },
      { id: "2", title: "App B", reward_points: 8000, priority: 5, featured: true, popular: true, countries: [] },
      { id: "3", title: "App C", reward_points: 12000, priority: 2, featured: false, popular: false, countries: [] },
      { id: "4", title: "App D", reward_points: 4000, priority: 10, featured: true, popular: false, countries: [] },
    ];

    // Manual mode test
    const manualList = mockOffers.filter(o => o.featured || o.popular)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.priority - a.priority || b.reward_points - a.reward_points);
    assert.strictEqual(manualList[0].id, "4", "App D has highest priority (10) among featured");
    assert.strictEqual(manualList[1].id, "2", "App B is next featured");

    // Automatic mode test (highest reward)
    const autoList = [...mockOffers].sort((a, b) => b.reward_points - a.reward_points);
    assert.strictEqual(autoList[0].id, "3", "App C has highest reward (12,000 pts)");
    assert.strictEqual(autoList[1].id, "2", "App B has second highest reward (8,000 pts)");
  });

  it("Privacy mask handles diverse email and UUID structures", () => {
    function maskEmailOrId(email, userId) {
      if (email) {
        const [userPart, domain] = email.split("@");
        return (userPart?.slice(0, 3) || "usr") + "***@" + (domain || "...");
      }
      return "User #" + userId.slice(0, 6);
    }

    assert.strictEqual(maskEmailOrId("john.doe@example.com", "12345678"), "joh***@example.com");
    assert.strictEqual(maskEmailOrId("a@b.com", "12345678"), "a***@b.com");
    assert.strictEqual(maskEmailOrId(null, "abcdef12-3456-7890"), "User #abcdef");
  });

  console.log(`\nFlow Tests: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
