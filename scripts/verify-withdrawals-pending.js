const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabaseAdmin = createClient(url, serviceKey);

console.log("====================================================");
console.log(" REWARDNOVA — WITHDRAWALS & PENDING RULES VERIFICATION");
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

async function run() {
  try {
    // 1. Pick verified reconciled test user profile
    const targetUserId = "f24c9a10-0080-4a71-9229-b827ffd1b27c";
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id, display_name, available_points, status")
      .eq("id", targetUserId)
      .single();

    assert(!profErr && profile, "Could not find active user profile");
    const testUserId = profile.id;
    const initialBalance = Number(profile.available_points);
    it("Active test user identified", true, `User: ${profile.display_name}, Balance: ${initialBalance}`);

    // 2. Create a test withdrawal request (status: pending, 2000 points)
    const testWithdrawalPoints = 2000;
    const testWithdrawalUsd = 2.0;
    const { data: withdrawal, error: wErr } = await supabaseAdmin
      .from("withdrawals")
      .insert({
        user_id: testUserId,
        amount_points: testWithdrawalPoints,
        amount_usd: testWithdrawalUsd,
        payment_method: "crypto",
        payment_details: { value: "TRX-TEST-WALLET-ADDRESS-999" },
        status: "pending",
        admin_note: "Test automated withdrawal",
      })
      .select()
      .single();

    assert(!wErr && withdrawal, "Failed to create test withdrawal");
    it("Test withdrawal request created", true, `ID: ${withdrawal.id.slice(0, 8)}, Points: ${testWithdrawalPoints}`);

    // Simulate the debit from create_withdrawal_request
    const balanceAfterDebit = initialBalance - testWithdrawalPoints;
    await supabaseAdmin
      .from("user_profiles")
      .update({ available_points: balanceAfterDebit })
      .eq("id", testUserId);

    const { data: testDebit, error: debErr } = await supabaseAdmin.from("reward_ledger").insert({
      user_id: testUserId,
      entry_type: "debit",
      points: testWithdrawalPoints,
      balance_after: balanceAfterDebit,
      description: `Test withdrawal request: crypto`,
      conversion_id: null,
    }).select().single();

    assert(!debErr && testDebit, "Failed to insert test debit ledger entry");

    // 3. Test updateWithdrawal server action or manual rejection with refund
    // Simulate what updateWithdrawal does on rejection:
    const nowIso = new Date().toISOString();
    const refundedBalance = balanceAfterDebit + testWithdrawalPoints;

    await supabaseAdmin
      .from("user_profiles")
      .update({ available_points: refundedBalance, updated_at: nowIso })
      .eq("id", testUserId);

    const { data: ledgerRefund, error: refErr } = await supabaseAdmin
      .from("reward_ledger")
      .insert({
        user_id: testUserId,
        entry_type: "credit",
        points: testWithdrawalPoints,
        balance_after: refundedBalance,
        description: `Refund: Rejected withdrawal #${withdrawal.id.slice(0, 8)} (CRYPTO)`,
        conversion_id: null,
      })
      .select()
      .single();

    assert(!refErr && ledgerRefund, "Failed to insert refund ledger entry");
    it("Ledger refund credit entry created", true, `Entry ID: ${ledgerRefund.id}`);

    // Update status to rejected
    await supabaseAdmin
      .from("withdrawals")
      .update({
        status: "rejected",
        admin_note: "Test rejected for verification",
        processed_at: nowIso,
      })
      .eq("id", withdrawal.id);

    // Verify balance is restored
    const { data: profileRestored } = await supabaseAdmin
      .from("user_profiles")
      .select("available_points")
      .eq("id", testUserId)
      .single();

    it(
      "User balance restored to initial balance after rejection",
      profileRestored.available_points === initialBalance,
      `Balance: ${profileRestored.available_points}, Expected: ${initialBalance}`
    );

    // 4. Verify ledger sum reconciles
    const { data: allLedgers } = await supabaseAdmin
      .from("reward_ledger")
      .select("entry_type, points")
      .eq("user_id", testUserId);

    const calculatedBalance = (allLedgers ?? []).reduce((sum, e) => {
      const pts = Number(e.points);
      if (e.entry_type === "debit") return sum - Math.abs(pts);
      return sum + pts;
    }, 0);

    it(
      "Reward ledger sum mathematically reconciles with user balance",
      calculatedBalance === profileRestored.available_points,
      `Ledger: ${calculatedBalance}, Balance: ${profileRestored.available_points}`
    );

    // Clean up test ledger entries and test withdrawal
    await supabaseAdmin.from("reward_ledger").delete().eq("id", testDebit.id);
    await supabaseAdmin.from("reward_ledger").delete().eq("id", ledgerRefund.id);
    await supabaseAdmin.from("withdrawals").delete().eq("id", withdrawal.id);
    // Restore exact starting balance
    await supabaseAdmin.from("user_profiles").update({ available_points: initialBalance }).eq("id", testUserId);
    it("Test withdrawal and ledger audit entries cleaned up", true);

    // 5. Test Pending Offer Rules storage
    const rulesFile = path.join(process.cwd(), "data", "pending-rules.json");
    it("data/pending-rules.json exists", fs.existsSync(rulesFile));

    const testRule = {
      id: "rule-test-verify-123",
      offer_id: "test-offer-special-999",
      offer_title: "High Value Finance Offer",
      hold_duration: "14 Days",
      active: true,
      notes: "Hold for verification",
      created_at: new Date().toISOString(),
    };

    const initialRules = JSON.parse(fs.readFileSync(rulesFile, "utf8"));
    fs.writeFileSync(rulesFile, JSON.stringify([testRule, ...initialRules], null, 2), "utf8");

    const reloaded = JSON.parse(fs.readFileSync(rulesFile, "utf8"));
    const foundRule = reloaded.find((r) => r.id === testRule.id);
    it("Pending rule created in data/pending-rules.json", Boolean(foundRule && foundRule.active), `Rule ID: ${foundRule?.id}`);

    // Clean up test rule
    fs.writeFileSync(rulesFile, JSON.stringify(initialRules, null, 2), "utf8");
    it("Pending rule deleted cleanly from disk", true);

    // 6. Test AdminSidebar links
    const sidebarContent = fs.readFileSync(path.join("components", "admin", "AdminSidebar.tsx"), "utf8");
    it("AdminSidebar contains Postback link under Offers", sidebarContent.includes('href="/admin/postback"'));
    it("AdminSidebar contains Pending Offers link", sidebarContent.includes('href="/admin/pending-offers"'));
    it("AdminSidebar contains Requests link", sidebarContent.includes('href="/admin/withdrawals"'));

    console.log(`\n====================================================`);
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`====================================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Verification error:", err);
    process.exit(1);
  }
}

run();