const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const anonKey = (env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/))[1].trim();
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabaseAnon = createClient(url, anonKey);
const supabaseAdmin = createClient(url, serviceKey);

async function runMatrix() {
  console.log('====================================================');
  console.log(' REWARDNOVA — PHASE 12 SECURITY TESTING MATRIX');
  console.log('====================================================\n');

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

  const testUserId = 'f24c9a10-0080-4a71-9229-b827ffd1b27c';
  const knownOfferId = '41d1c694-9297-49be-a254-fb8d5930159b'; // Quick Survey Reward (5,000 pts)

  // 1. Unauthenticated create_offer_click()
  try {
    const { error } = await supabaseAnon.rpc('create_offer_click', {
      p_offer_id: knownOfferId,
      p_source: 'matrix_test'
    });
    assert('Unauthenticated create_offer_click() blocked', error !== null, error?.message);
  } catch (e) {
    assert('Unauthenticated create_offer_click() blocked', true);
  }

  // 2. Direct offer_clicks INSERT blocked
  try {
    const { error } = await supabaseAnon.from('offer_clicks').insert({
      offer_id: knownOfferId,
      click_id: 'illegal-' + Date.now(),
      status: 'clicked'
    });
    assert('Direct offer_clicks INSERT blocked', error !== null, error?.message);
  } catch (e) {
    assert('Direct offer_clicks INSERT blocked', true);
  }

  // 3. Direct conversion INSERT blocked
  try {
    const { error } = await supabaseAnon.from('conversions').insert({
      user_id: testUserId,
      offer_id: knownOfferId,
      reward_points: 999999,
      status: 'approved'
    });
    assert('Direct conversions INSERT blocked', error !== null, error?.message);
  } catch (e) {
    assert('Direct conversions INSERT blocked', true);
  }

  // 4. Direct ledger INSERT blocked
  try {
    const { error } = await supabaseAnon.from('reward_ledger').insert({
      user_id: testUserId,
      points: 999999,
      entry_type: 'credit'
    });
    assert('Direct reward_ledger INSERT blocked', error !== null, error?.message);
  } catch (e) {
    assert('Direct reward_ledger INSERT blocked', true);
  }

  // 5. Direct balance UPDATE blocked
  try {
    const { error } = await supabaseAnon.from('user_profiles').update({
      available_points: 999999
    }).eq('id', testUserId);
    assert('Direct user_profiles balance UPDATE blocked', error !== null, error?.message);
  } catch (e) {
    assert('Direct user_profiles balance UPDATE blocked', true);
  }

  // 6. Direct withdrawals UPDATE blocked
  try {
    const { error } = await supabaseAnon.from('withdrawals').update({
      status: 'paid'
    }).eq('user_id', testUserId);
    assert('Direct withdrawals UPDATE blocked', error !== null, error?.message);
  } catch (e) {
    assert('Direct withdrawals UPDATE blocked', true);
  }

  // 7. Direct admin_users access blocked
  try {
    const { data, error } = await supabaseAnon.from('admin_users').select('*');
    assert('Direct admin_users SELECT blocked for anon', error !== null || data?.length === 0, error?.message || 'empty');
  } catch (e) {
    assert('Direct admin_users SELECT blocked for anon', true);
  }

  // 8. Test lifecycle on an isolated click
  const testClickId = 'matrix-click-' + Date.now();
  const { data: createdClick, error: clickErr } = await supabaseAdmin.from('offer_clicks').insert({
    user_id: testUserId,
    offer_id: knownOfferId,
    click_id: testClickId,
    status: 'clicked',
    source: 'matrix_suite'
  }).select().single();

  assert('Trusted server click creation', !clickErr && createdClick?.click_id === testClickId);
  assert('New click initial status is clicked', createdClick?.status === 'clicked');

  // Initial balance
  const { data: initProf } = await supabaseAdmin.from('user_profiles').select('available_points').eq('id', testUserId).single();
  const initBal = Number(initProf.available_points);

  // 9. Pending postback transition
  const providerConvId = 'matrix-conv-' + Date.now();
  const { data: pendingRes, error: pendingErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: testClickId,
    p_status: 'pending',
    p_provider_name: 'Matrix Provider',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: {}
  });
  assert('Pending postback processed', !pendingErr && pendingRes?.ok, pendingErr?.message);

  const { data: midProf } = await supabaseAdmin.from('user_profiles').select('available_points').eq('id', testUserId).single();
  assert('Pending status awards 0 points', Number(midProf.available_points) === initBal);

  // 10. Duplicate pending postback
  const { data: dupPendingRes } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: testClickId,
    p_status: 'pending',
    p_provider_name: 'Matrix Provider',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: {}
  });
  assert('Duplicate pending postback detected', dupPendingRes?.duplicate === true);

  // 11. Pending -> Approved transition
  const { data: appRes, error: appErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: testClickId,
    p_status: 'approved',
    p_provider_name: 'Matrix Provider',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: {}
  });
  assert('Approved postback transitions successfully', !appErr && appRes?.ok);

  const { data: appProf } = await supabaseAdmin.from('user_profiles').select('available_points').eq('id', testUserId).single();
  assert('Approved postback awards exactly 5,000 points', Number(appProf.available_points) === initBal + 5000);

  // 12. Duplicate approved postback
  const { data: dupAppRes } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: testClickId,
    p_status: 'approved',
    p_provider_name: 'Matrix Provider',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: {}
  });
  assert('Duplicate approved postback detected as duplicate', dupAppRes?.duplicate === true);

  const { data: postDupProf } = await supabaseAdmin.from('user_profiles').select('available_points').eq('id', testUserId).single();
  assert('Balance unchanged after duplicate approved postback', Number(postDupProf.available_points) === initBal + 5000);

  // 13. Approved -> Reversed compensating deduction
  const { data: revRes, error: revErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: testClickId,
    p_status: 'reversed',
    p_provider_name: 'Matrix Provider',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: {}
  });
  assert('Approved -> Reversed postback processed cleanly', !revErr && revRes?.ok);

  const { data: revProf } = await supabaseAdmin.from('user_profiles').select('available_points').eq('id', testUserId).single();
  assert('Compensating deduction restores initial balance', Number(revProf.available_points) === initBal);

  // 14. Duplicate reversal idempotency
  const { data: dupRevRes } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: testClickId,
    p_status: 'reversed',
    p_provider_name: 'Matrix Provider',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: {}
  });
  assert('Duplicate reversal handled idempotently', dupRevRes?.duplicate === true);

  const { data: finalRevProf } = await supabaseAdmin.from('user_profiles').select('available_points').eq('id', testUserId).single();
  assert('Balance unchanged after duplicate reversal', Number(finalRevProf.available_points) === initBal);

  // 15. Cross-click provider conversion ID reuse rejected
  const anotherTestClickId = 'matrix-another-' + Date.now();
  await supabaseAdmin.from('offer_clicks').insert({
    user_id: testUserId,
    offer_id: knownOfferId,
    click_id: anotherTestClickId,
    status: 'clicked',
    source: 'matrix_suite'
  });

  let crossClickBlocked = false;
  try {
    const { data: crossRes, error: crossErr } = await supabaseAdmin.rpc('process_offer_postback', {
      p_click_id: anotherTestClickId,
      p_status: 'approved',
      p_provider_name: 'Matrix Provider',
      p_provider_conversion_id: providerConvId, // Already used on testClickId!
      p_payout_usd: 5.0,
      p_payload: {}
    });
    crossClickBlocked = crossErr !== null || crossRes?.ok === false;
  } catch {
    crossClickBlocked = true;
  }
  assert('Cross-click provider conversion ID reuse rejected', crossClickBlocked);

  // 16. Final ledger sum reconciliation
  const { data: ledgerRows } = await supabaseAdmin.from('reward_ledger').select('points, entry_type').eq('user_id', testUserId);
  const ledgerSum = ledgerRows.reduce((sum, r) => {
    const pts = Number(r.points);
    return r.entry_type === 'debit' ? sum - Math.abs(pts) : sum + pts;
  }, 0);
  assert('Ledger sum reconciles with user available_points', ledgerSum === Number(finalRevProf.available_points), `Ledger: ${ledgerSum}, Balance: ${finalRevProf.available_points}`);

  // Test notification cleanup: Delete any test notifications for testUserId
  try {
    await supabaseAdmin.from('notifications').delete().eq('user_id', testUserId).in('title', ['Reward credited', 'Reward reversed']);
  } catch (e) {
    // Ignore cleanup error
  }

  console.log('\n====================================================');
  console.log(` MATRIX RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runMatrix().catch(e => {
  console.error(e);
  process.exit(1);
});
