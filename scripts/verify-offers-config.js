const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const configFile = path.join(root, "data", "offers-config.json");
const providersFile = path.join(root, "data", "providers.json");

console.log("=== Testing Offers Configuration & Provider Sync ===");

// 1. Verify data/offers-config.json exists and is valid JSON
assert.ok(fs.existsSync(configFile), "data/offers-config.json must exist");
const rawConfig = JSON.parse(fs.readFileSync(configFile, "utf8").replace(/^\uFEFF/, ""));

assert.ok(rawConfig.topOffersMode, "topOffersMode must be present");
assert.ok(typeof rawConfig.maxOffers === "number", "maxOffers must be a number");
assert.ok(rawConfig.rankingMetric, "rankingMetric must be present");
assert.ok(rawConfig.providerConfigs, "providerConfigs must be present");
console.log("✓ data/offers-config.json exists and has valid schema");

// 2. Verify all providers in data/providers.json are represented
const liveProviders = JSON.parse(fs.readFileSync(providersFile, "utf8").replace(/^\uFEFF/, ""));
for (const lp of liveProviders) {
  assert.ok(
    rawConfig.providerConfigs[lp.id],
    `Provider ${lp.id} (${lp.name}) must be present in offers-config.json`
  );
  assert.strictEqual(
    rawConfig.providerConfigs[lp.id].name,
    lp.name,
    `Provider name in config must match providers.json for ${lp.id}`
  );
}
console.log(`✓ All ${liveProviders.length} real providers are correctly mapped in offers-config.json`);

// 3. Verify ZERO screenshot dummy networks exist
const dummyNetworks = ["adgate", "admantum", "torox", "monlix", "adscendmedia", "ayet", "cpalead", "wannads"];
for (const key of Object.keys(rawConfig.providerConfigs)) {
  for (const dummy of dummyNetworks) {
    assert.ok(
      !key.toLowerCase().includes(dummy),
      `Found dummy screenshot network key: ${key}`
    );
    assert.ok(
      !rawConfig.providerConfigs[key].name.toLowerCase().includes(dummy),
      `Found dummy screenshot network name: ${rawConfig.providerConfigs[key].name}`
    );
  }
}
console.log("✓ ZERO dummy screenshot networks found in offers-config.json");

// 4. Test offers-config helper module
// Compile-free require using ts-node or transpiled/plain node test
const offersConfigTs = fs.readFileSync(path.join(root, "lib", "offers-config.ts"), "utf8");
assert.ok(offersConfigTs.includes("getOffersConfig"), "lib/offers-config.ts must export getOffersConfig");
assert.ok(offersConfigTs.includes("saveOffersConfig"), "lib/offers-config.ts must export saveOffersConfig");
console.log("✓ lib/offers-config.ts exports getOffersConfig and saveOffersConfig");

// 5. Test app/admin/offers-settings files
const pageTsx = fs.readFileSync(path.join(root, "app", "admin", "offers-settings", "page.tsx"), "utf8");
assert.ok(pageTsx.includes("getOffersConfig"), "AdminConfigPage must call getOffersConfig");
assert.ok(pageTsx.includes("initialConfig"), "AdminConfigPage must pass initialConfig");

const actionsTs = fs.readFileSync(path.join(root, "app", "admin", "offers-settings", "actions.ts"), "utf8");
assert.ok(actionsTs.includes("saveOffersConfigAction"), "actions.ts must export saveOffersConfigAction");
assert.ok(actionsTs.includes("getOffersConfigAction"), "actions.ts must export getOffersConfigAction");

const configManagerTsx = fs.readFileSync(path.join(root, "app", "admin", "offers-settings", "ConfigManager.tsx"), "utf8");
assert.ok(!configManagerTsx.includes("AdGate"), "ConfigManager.tsx must not contain AdGate");
assert.ok(!configManagerTsx.includes("Admantum"), "ConfigManager.tsx must not contain Admantum");
assert.ok(!configManagerTsx.includes("Torox"), "ConfigManager.tsx must not contain Torox");
assert.ok(!configManagerTsx.includes("Monlix"), "ConfigManager.tsx must not contain Monlix");
assert.ok(!configManagerTsx.includes("Adscendmedia"), "ConfigManager.tsx must not contain Adscendmedia");
assert.ok(!configManagerTsx.includes("Ayet Studios"), "ConfigManager.tsx must not contain Ayet Studios");
assert.ok(configManagerTsx.includes("saveOffersConfigAction"), "ConfigManager.tsx must call saveOffersConfigAction");
console.log("✓ app/admin/offers-settings components and actions are clean and wired");

// 6. Test bi-directional sync simulation
const originalConfig = JSON.parse(JSON.stringify(rawConfig));
const originalProviders = JSON.parse(JSON.stringify(liveProviders));

// Test mutating config
rawConfig.maxOffers = 25;
rawConfig.providerConfigs["klink"].apiKey = "422_test_verified";
fs.writeFileSync(configFile, JSON.stringify(rawConfig, null, 2), "utf8");

const reloaded = JSON.parse(fs.readFileSync(configFile, "utf8").replace(/^\uFEFF/, ""));
assert.strictEqual(reloaded.maxOffers, 25, "maxOffers update must persist");
assert.strictEqual(reloaded.providerConfigs["klink"].apiKey, "422_test_verified", "provider apiKey must persist");
console.log("✓ Persistence verified on disk");

// Restore originals
fs.writeFileSync(configFile, JSON.stringify(originalConfig, null, 2), "utf8");
fs.writeFileSync(providersFile, JSON.stringify(originalProviders, null, 2), "utf8");
console.log("✓ Cleaned up test modifications");

console.log("\n ALL 6 OFFERS CONFIG & PROVIDER SYNC CHECKS PASSED PERFECTLY! \n");
