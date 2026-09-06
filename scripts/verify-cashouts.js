const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("====================================================");
console.log(" REWARDNOVA — CASHOUT METHODS & WITHDRAW STORE SYNC");
console.log("====================================================\n");

let passed = 0;
let failed = 0;

function it(desc, condition, details = "") {
  if (condition) {
    console.log("✅ PASS: " + desc + (details ? " (" + details + ")" : ""));
    passed++;
  } else {
    console.error("❌ FAIL: " + desc + (details ? " (" + details + ")" : ""));
    failed++;
  }
}

function run() {
  const cashoutsFile = path.join(process.cwd(), "data", "cashout-methods.json");

  // 1. Verify data/cashout-methods.json exists & contains core methods
  it("data/cashout-methods.json exists on disk", fs.existsSync(cashoutsFile));
  const raw = fs.readFileSync(cashoutsFile, "utf8");
  const methods = JSON.parse(raw);
  it("cashout-methods.json contains array of methods", Array.isArray(methods) && methods.length >= 4, `Count: ${methods.length}`);

  const paypal = methods.find((m) => m.name.toLowerCase().includes("paypal"));
  const ltc = methods.find((m) => m.name.toLowerCase().includes("litecoin"));
  const usdt = methods.find((m) => m.name.toLowerCase().includes("usdt"));
  const trx = methods.find((m) => m.name.toLowerCase().includes("tron"));

  it("PayPal method configured", Boolean(paypal && paypal.minimum === 1000), `Min: ${paypal?.minimum}`);
  it("Litecoin (LTC) method configured", Boolean(ltc && ltc.minimum === 250), `Min: ${ltc?.minimum}`);
  it("USDT (TRC20) method configured", Boolean(usdt && usdt.minimum === 1000), `Min: ${usdt?.minimum}`);
  it("TRON (TRX) method configured", Boolean(trx && trx.minimum === 100), `Min: ${trx?.minimum}`);

  // 2. Verify lib/cashouts.ts exports
  const libCashouts = fs.readFileSync(path.join(process.cwd(), "lib", "cashouts.ts"), "utf8");
  it("lib/cashouts.ts exports getCashoutMethods", libCashouts.includes("export function getCashoutMethods"));
  it("lib/cashouts.ts exports getActiveCashoutMethods", libCashouts.includes("export function getActiveCashoutMethods"));
  it("lib/cashouts.ts exports updateCashoutMethod", libCashouts.includes("export function updateCashoutMethod"));
  it("lib/cashouts.ts exports toggleCashoutMethod", libCashouts.includes("export function toggleCashoutMethod"));

  // 3. Verify server actions in app/admin/cashouts/actions.ts
  const actions = fs.readFileSync(path.join(process.cwd(), "app", "admin", "cashouts", "actions.ts"), "utf8");
  it("app/admin/cashouts/actions.ts provides toggleCashoutMethodAction", actions.includes("export async function toggleCashoutMethodAction"));
  it("app/admin/cashouts/actions.ts provides updateCashoutMethodAction", actions.includes("export async function updateCashoutMethodAction"));
  it("app/admin/cashouts/actions.ts provides createCashoutMethodAction", actions.includes("export async function createCashoutMethodAction"));

  // 4. Verify app/api/withdrawals/route.ts checks active cashout methods and minimums
  const withdrawRoute = fs.readFileSync(path.join(process.cwd(), "app", "api", "withdrawals", "route.ts"), "utf8");
  it("app/api/withdrawals/route.ts imports getActiveCashoutMethods", withdrawRoute.includes("getActiveCashoutMethods"));
  it("app/api/withdrawals/route.ts validates method status", withdrawRoute.includes("is currently disabled or unavailable"));
  it("app/api/withdrawals/route.ts enforces method-specific minimum", withdrawRoute.includes("amountPoints < matchedMethod.minimum"));

  // 5. Verify user-facing app/withdraw/WithdrawForm.tsx connects active methods
  const withdrawForm = fs.readFileSync(path.join(process.cwd(), "app", "withdraw", "WithdrawForm.tsx"), "utf8");
  it("WithdrawForm renders dynamic methods selection", withdrawForm.includes("activeMethods.map"));
  it("WithdrawForm dynamically checks selectedMethod.minimum", withdrawForm.includes("selectedMethod.minimum"));
  it("WithdrawForm updates destination prompt dynamically", withdrawForm.includes("selectedMethod.payment_title"));

  console.log(`\n====================================================`);
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================\n`);

  if (failed > 0) process.exit(1);
}

run();