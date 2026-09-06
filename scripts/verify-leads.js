const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const anonKey = (env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/))[1].trim();
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabaseAnon = createClient(url, anonKey);
const supabaseAdmin = createClient(url, serviceKey);

async function runLeadsVerification() {
  console.log('====================================================');
  console.log(' REWARDNOVA — ADMIN LEADS ACTIVITY VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log('PASS: ' + name + (details ? ' (' + details + ')' : ''));
      passed++;
    } else {
      console.error('FAIL: ' + name + (details ? ' (' + details + ')' : ''));
      failed++;
    }
  }

  const testUserId = 'f24c9a10-0080-4a71-9229-b827ffd1b27c';
  const clickId = 'lead-verify-click-' + Date.now();
  const providerConvId = 'lead-verify-conv-' + Date.now();

  // 1. Fetch initial user balance
  const { data: initialProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('available_points')
    .eq('id', testUserId)
    .single();

  const initialBalance = Number(initialProfile.available_points);
  assert('Initial balance fetched', initialBalance >= 0, 'Balance: ' + initialBalance);

  // 2. Create an approved test conversion via trusted server
  const { data: clickRecord, error: clickErr } = await supabaseAdmin
    .from('offer_clicks')
    .insert({
      user_id: testUserId,
      offer_id: '41d1c694-9297-49be-a254-fb8d5930159b',
      click_id: clickId,
      status: 'clicked',
      source: 'test_lead_suite',
      country_code: 'BD',
      device_type: 'Desktop'
    })
    .select()
    .single();

  assert('Test offer click created', !clickErr && !!clickRecord, clickErr?.message);

  const { data: postbackResult, error: pbErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: clickId,
    p_status: 'approved',
    p_provider_name: 'RewardNova Lead Test',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 2.50,
    p_payload: { test_source: 'verify_leads' }
  });

  assert('Approved lead created', !pbErr && postbackResult?.ok === true, JSON.stringify(postbackResult));
  const conversionId = postbackResult?.conversion_id;

  // 3. Verify user balance credited by 5,000 points
  const { data: creditedProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('available_points')
    .eq('id', testUserId)
    .single();

  const expectedCredited = initialBalance + 5000;
  assert('User balance credited by 5,000 points', Number(creditedProfile.available_points) === expectedCredited, 'Balance: ' + creditedProfile.available_points);

  // 4. Test Lead Inspector Data Retrieval
  const { data: leadRecord, error: leadErr } = await supabaseAdmin
    .from('conversions')
    .select('*, offers(title, category)')
    .eq('id', conversionId)
    .single();

  assert('Lead inspector retrieves complete record', !leadErr && !!leadRecord, 'Provider: ' + leadRecord?.provider_name);
  assert('Postback payload intact', leadRecord?.postback_payload?.test_source === 'verify_leads');

  // 5. Test Manual Lead Reversal Action
  const { data: revResult, error: revErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: clickId,
    p_status: 'reversed',
    p_provider_name: 'RewardNova Lead Test',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 2.50,
    p_payload: { reason: 'Admin test reversal' }
  });

  assert('Manual lead reversal executed', !revErr && revResult?.ok === true && revResult?.status === 'reversed', revErr?.message);

  // 6. Verify User Balance Restored
  const { data: restoredProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('available_points')
    .eq('id', testUserId)
    .single();

  assert('User balance deducted back to initial', Number(restoredProfile.available_points) === initialBalance, 'Balance: ' + restoredProfile.available_points);

  // 7. Verify Ledger Reversal Entry
  const { data: ledgerEntries } = await supabaseAdmin
    .from('reward_ledger')
    .select('points, entry_type, balance_after')
    .eq('user_id', testUserId)
    .order('created_at', { ascending: false });

  const latestLedger = ledgerEntries[0];
  assert('Ledger reversal entry logged', latestLedger.entry_type === 'reversal', 'Type: ' + latestLedger.entry_type);

  // 8. Verify Mathematical Ledger Reconciliation
  const ledgerSum = ledgerEntries.reduce((sum, e) => {
    const pts = Number(e.points);
    if (e.entry_type === 'debit') return sum - Math.abs(pts);
    return sum + pts;
  }, 0);

  assert('Ledger sum mathematically reconciles with user balance', ledgerSum === initialBalance, 'Ledger Sum: ' + ledgerSum + ', Balance: ' + initialBalance);

  // 9. Test Lead Record Deletion
  await supabaseAdmin
    .from('reward_ledger')
    .update({ conversion_id: null })
    .eq('conversion_id', conversionId);

  const { error: delErr } = await supabaseAdmin
    .from('conversions')
    .delete()
    .eq('id', conversionId);

  assert('Lead record deleted successfully', !delErr, delErr?.message);

  // 10. Clean up test click
  await supabaseAdmin.from('offer_clicks').delete().eq('click_id', clickId);
  await supabaseAdmin.from('notifications').delete().eq('user_id', testUserId).ilike('message', '%Lead Reversed%');

  console.log('\n====================================================');
  console.log(' RESULTS: ' + passed + ' PASSED, ' + failed + ' FAILED');
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runLeadsVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
