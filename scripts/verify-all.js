const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const anonKey = (env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/))[1].trim();
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabaseAnon = createClient(url, anonKey);
const supabaseAdmin = createClient(url, serviceKey);

async function runTestSuite() {
  console.log('==============================================');
  console.log(' REWARDNOVA — FULL AUTOMATED VERIFICATION SUITE');
  console.log('==============================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${name} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // 1. Unauthenticated create_offer_click blocked
  try {
    const { data, error } = await supabaseAnon.rpc('create_offer_click', {
      p_offer_id: '140ec9bf-c2f0-4460-ac56-b503b3423630',
      p_source: 'earn_wall',
      p_sub_id: null,
      p_country_code: 'BD',
      p_device_type: 'Desktop',
      p_user_agent: 'TestAgent'
    });
    assert('Unauthenticated create_offer_click blocked', error !== null, error?.message);
  } catch (e) {
    assert('Unauthenticated create_offer_click blocked', true, e.message);
  }

  // 2. Direct client insert into offer_clicks blocked
  try {
    const { error } = await supabaseAnon.from('offer_clicks').insert({
      offer_id: '140ec9bf-c2f0-4460-ac56-b503b3423630',
      click_id: 'illegal-click-' + Date.now(),
      status: 'clicked'
    });
    assert('Direct client insert into offer_clicks blocked', error !== null, error?.message || 'blocked');
  } catch (e) {
    assert('Direct client insert into offer_clicks blocked', true);
  }

  // 3. Direct client insert into conversions blocked
  try {
    const { error } = await supabaseAnon.from('conversions').insert({
      user_id: '46637e5b-cf5f-40aa-8775-fd6c15baf10b',
      offer_id: '140ec9bf-c2f0-4460-ac56-b503b3423630',
      reward_points: 999999,
      status: 'approved'
    });
    assert('Direct client insert into conversions blocked', error !== null, error?.message || 'blocked');
  } catch (e) {
    assert('Direct client insert into conversions blocked', true);
  }

  // 4. Direct client insert into reward_ledger blocked
  try {
    const { error } = await supabaseAnon.from('reward_ledger').insert({
      user_id: '46637e5b-cf5f-40aa-8775-fd6c15baf10b',
      points: 999999,
      balance_after: 999999,
      entry_type: 'credit'
    });
    assert('Direct client insert into reward_ledger blocked', error !== null, error?.message || 'blocked');
  } catch (e) {
    assert('Direct client insert into reward_ledger blocked', true);
  }

  // 5. Direct client balance modification blocked
  try {
    const { error } = await supabaseAnon.from('user_profiles').update({
      available_points: 999999
    }).eq('id', '46637e5b-cf5f-40aa-8775-fd6c15baf10b');
    assert('Direct client balance UPDATE blocked', error !== null, error?.message || 'blocked');
  } catch (e) {
    assert('Direct client balance UPDATE blocked', true);
  }

  // 6. Direct execution of process_offer_postback blocked for anon
  try {
    const { data, error } = await supabaseAnon.rpc('process_offer_postback', {
      p_click_id: 'fake-click',
      p_status: 'approved',
      p_provider_name: 'fake',
      p_provider_conversion_id: 'fake',
      p_payout_usd: 10,
      p_payload: {}
    });
    assert('Direct process_offer_postback blocked for anon', error !== null, error?.message || 'blocked');
  } catch (e) {
    assert('Direct process_offer_postback blocked for anon', true);
  }

  // 7. Test user authentication & authenticated click creation
  const testUserId = 'f24c9a10-0080-4a71-9229-b827ffd1b27c';
  const clickId = 'test-e2e-click-' + Date.now();
  const { data: createdClick, error: clickErr } = await supabaseAdmin.from('offer_clicks').insert({
    user_id: testUserId,
    offer_id: '41d1c694-9297-49be-a254-fb8d5930159b', // Quick Survey Reward (5000 pts)
    click_id: clickId,
    status: 'clicked',
    source: 'test_suite',
    country_code: 'BD',
    device_type: 'Desktop'
  }).select().single();

  assert('Test offer click created via trusted server', !clickErr && createdClick?.click_id === clickId, clickErr?.message);

  // 8. Test initial balance
  const { data: preProfile } = await supabaseAdmin.from('user_profiles').select('available_points, lifetime_points').eq('id', testUserId).single();
  const initialBalance = Number(preProfile.available_points);

  // 9. Process approved postback through trusted process_offer_postback RPC
  const providerConvId = 'prov-conv-' + Date.now();
  const { data: convResult, error: convErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: clickId,
    p_status: 'approved',
    p_provider_name: 'RewardNova Demo',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: { test: true }
  });

  assert('Approved postback processed successfully', !convErr && convResult?.ok === true && convResult?.status === 'approved', convErr?.message);

  // 10. Balance credited accurately
  const { data: postProfile } = await supabaseAdmin.from('user_profiles').select('available_points, lifetime_points').eq('id', testUserId).single();
  const updatedBalance = Number(postProfile.available_points);
  assert('User balance credited by 5,000 points', updatedBalance === initialBalance + 5000, `Initial: ${initialBalance}, Updated: ${updatedBalance}`);

  // 11. Duplicate approved postback idempotency test
  const { data: dupResult, error: dupErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: clickId,
    p_status: 'approved',
    p_provider_name: 'RewardNova Demo',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: { test: true }
  });
  assert('Duplicate approved postback detected as duplicate', !dupErr && dupResult?.duplicate === true, JSON.stringify(dupResult));

  // 12. Verify balance was NOT credited twice
  const { data: dupProfile } = await supabaseAdmin.from('user_profiles').select('available_points').eq('id', testUserId).single();
  assert('Balance unchanged after duplicate postback', Number(dupProfile.available_points) === updatedBalance);

  // 13. Reversal test (approved -> reversed)
  const { data: revResult, error: revErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: clickId,
    p_status: 'reversed',
    p_provider_name: 'RewardNova Demo',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: { reason: 'chargeback' }
  });
  assert('Reversal processed cleanly', !revErr && revResult?.ok === true && revResult?.status === 'reversed', revErr?.message);

  // 14. Verify compensating balance deduction
  const { data: revProfile } = await supabaseAdmin.from('user_profiles').select('available_points').eq('id', testUserId).single();
  assert('Compensating balance deduction applied (-5,000 pts)', Number(revProfile.available_points) === initialBalance, `Current: ${revProfile.available_points}, Expected: ${initialBalance}`);

  // 15. Duplicate reversal test
  const { data: dupRevResult, error: dupRevErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: clickId,
    p_status: 'reversed',
    p_provider_name: 'RewardNova Demo',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: { reason: 'chargeback' }
  });
  assert('Duplicate reversal handled idempotently', !dupRevErr && dupRevResult?.duplicate === true);

  // 16. Verify balance not deducted again
  const { data: dupRevProfile } = await supabaseAdmin.from('user_profiles').select('available_points').eq('id', testUserId).single();
  assert('Balance unchanged after duplicate reversal', Number(dupRevProfile.available_points) === initialBalance);

  // 17. Reusing provider conversion ID on another click rejected
  const anotherClickId = 'test-e2e-another-' + Date.now();
  await supabaseAdmin.from('offer_clicks').insert({
    user_id: testUserId,
    offer_id: '41d1c694-9297-49be-a254-fb8d5930159b',
    click_id: anotherClickId,
    status: 'clicked',
    source: 'test'
  });
  let crossClickBlocked = false;
  try {
    const { data: crossClickResult, error: crossClickErr } = await supabaseAdmin.rpc('process_offer_postback', {
      p_click_id: anotherClickId,
      p_status: 'approved',
      p_provider_name: 'RewardNova Demo',
      p_provider_conversion_id: providerConvId, // Already used on clickId!
      p_payout_usd: 5.0,
      p_payload: {}
    });
    crossClickBlocked = crossClickErr !== null || crossClickResult?.ok === false;
  } catch (e) {
    crossClickBlocked = true;
  }
  assert('Reusing provider conversion ID on another click rejected', crossClickBlocked);

  // 18. Check ledger reconciliation
  const { data: ledgerEntries } = await supabaseAdmin.from('reward_ledger').select('points, entry_type').eq('user_id', testUserId);
  const ledgerSum = ledgerEntries.reduce((sum, e) => {
    const pts = Number(e.points);
    if (e.entry_type === 'debit') return sum - Math.abs(pts);
    return sum + pts;
  }, 0);
  const { data: finalProfile } = await supabaseAdmin.from('user_profiles').select('available_points').eq('id', testUserId).single();
  assert('Ledger entries sum reconciles with available_points', ledgerSum === Number(finalProfile.available_points), `Ledger Sum: ${ledgerSum}, Profile Balance: ${finalProfile.available_points}`);

  // Clean up any test notifications generated during verification so user inbox remains clean
  await supabaseAdmin.from('notifications')
    .delete()
    .eq('user_id', testUserId)
    .ilike('title', 'Reward%');

  console.log('\n==============================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==============================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error(e);
  process.exit(1);
});
