const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function runTests() {
  console.log('==============================================');
  console.log(' REWARDNOVA — POSTBACK & DOMAIN VERIFICATION');
  console.log('==============================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, condition, extra = '') {
    if (condition) {
      console.log(`✅ PASS: ${name} ${extra ? '(' + extra + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name} ${extra ? '(' + extra + ')' : ''}`);
      failed++;
    }
  }

  // 1. Verify URL resolution and canonical domain in code files
  const urlHelperCode = fs.readFileSync(path.join(__dirname, '../lib/url-helper.ts'), 'utf8');
  test('Canonical production domain is https://www.rewardnova.shop in lib/url-helper.ts',
    urlHelperCode.includes('CANONICAL_SITE_URL = "https://www.rewardnova.shop"') &&
    urlHelperCode.includes('return CANONICAL_SITE_URL;'));

  const postbackHubCode = fs.readFileSync(path.join(__dirname, '../app/admin/postback/PostbackHub.tsx'), 'utf8');
  test('PostbackHub displays https://www.rewardnova.shop in production',
    postbackHubCode.includes('https://www.rewardnova.shop') &&
    postbackHubCode.includes('isLocalhost'));

  // 2. Test user for conversion testing
  const testUserId = 'f24c9a10-0080-4a71-9229-b827ffd1b27c';
  const { data: userProfile, error: profileErr } = await supabaseAdmin
    .from('user_profiles')
    .select('available_points, lifetime_points')
    .eq('id', testUserId)
    .single();
  test('Test user profile found in Supabase', !profileErr && !!userProfile, testUserId);

  const initialPoints = Number(userProfile.available_points);

  // 3. Create a unique test click for a marketplace offer
  const clickId = 'postback-test-click-' + Date.now();
  const { data: offerClick, error: clickErr } = await supabaseAdmin
    .from('offer_clicks')
    .insert({
      user_id: testUserId,
      offer_id: '41d1c694-9297-49be-a254-fb8d5930159b',
      click_id: clickId,
      status: 'clicked',
      source: 'postback_test',
    })
    .select()
    .single();
  test('Marketplace offer click created', !clickErr && offerClick?.click_id === clickId, clickErr?.message);

  // 4. Test RPC process_offer_postback directly
  const providerConvId = 'prov-tx-' + Date.now();
  const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: clickId,
    p_status: 'approved',
    p_provider_name: 'RewardNova Demo',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: { test_mode: true },
  });
  test('RPC process_offer_postback approved', !rpcErr && rpcRes?.ok === true && rpcRes?.status === 'approved', rpcErr?.message);

  // 5. Verify user balance credited
  const { data: updatedProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('available_points')
    .eq('id', testUserId)
    .single();
  const balanceAfterApproval = Number(updatedProfile.available_points);
  test('User balance credited by 5,000 points', balanceAfterApproval === initialPoints + 5000, `Before: ${initialPoints}, After: ${balanceAfterApproval}`);

  // 6. Test duplicate approved postback idempotency
  const { data: dupRes, error: dupErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: clickId,
    p_status: 'approved',
    p_provider_name: 'RewardNova Demo',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: { test_mode: true },
  });
  test('Duplicate postback handled idempotently', !dupErr && dupRes?.duplicate === true);

  // 7. Verify balance unchanged after duplicate
  const { data: profileAfterDup } = await supabaseAdmin
    .from('user_profiles')
    .select('available_points')
    .eq('id', testUserId)
    .single();
  test('Balance unchanged after duplicate postback', Number(profileAfterDup.available_points) === balanceAfterApproval);

  // 8. Reversal postback
  const { data: revRes, error: revErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: clickId,
    p_status: 'reversed',
    p_provider_name: 'RewardNova Demo',
    p_provider_conversion_id: providerConvId,
    p_payout_usd: 5.0,
    p_payload: { reason: 'chargeback' },
  });
  test('Reversal postback processed cleanly', !revErr && revRes?.ok === true && revRes?.status === 'reversed', revErr?.message);

  // 9. Verify compensating balance deduction
  const { data: profileAfterRev } = await supabaseAdmin
    .from('user_profiles')
    .select('available_points')
    .eq('id', testUserId)
    .single();
  test('Compensating balance deduction returned balance to initial', Number(profileAfterRev.available_points) === initialPoints, `Current: ${profileAfterRev.available_points}, Initial: ${initialPoints}`);

  // 10. Test provider network auth credential lookup from Supabase
  const { data: providerAuth } = await supabaseAdmin
    .from('provider_postback_auth')
    .select('*')
    .eq('enabled', true)
    .limit(1)
    .single();
  test('Provider auth credentials configured in Supabase', !!providerAuth && !!providerAuth.api_secret, providerAuth?.provider_name);

  // 11. Test offerwall tracking record inserted on-the-fly
  const offerwallClickId = 'ow-' + Date.now();
  const { data: anyOffer } = await supabaseAdmin.from('offers').select('id').limit(1).single();
  const { error: owClickErr } = await supabaseAdmin.from('offer_clicks').insert({
    user_id: testUserId,
    offer_id: anyOffer.id,
    click_id: offerwallClickId,
    status: 'clicked',
    source: 'Adswedmedia',
  });
  test('Partner offerwall tracking record inserted on-the-fly', !owClickErr, owClickErr?.message);

  const owConvId = 'ow-tx-' + Date.now();
  const { data: owRpcRes, error: owRpcErr } = await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: offerwallClickId,
    p_status: 'approved',
    p_provider_name: 'Adswedmedia',
    p_provider_conversion_id: owConvId,
    p_payout_usd: 5.0,
    p_payload: { offerwall: true },
  });
  test('Partner offerwall conversion credited to user', !owRpcErr && owRpcRes?.ok === true, owRpcErr?.message);

  // Clean up offerwall test click/reversal so user balance remains exact
  await supabaseAdmin.rpc('process_offer_postback', {
    p_click_id: offerwallClickId,
    p_status: 'reversed',
    p_provider_name: 'Adswedmedia',
    p_provider_conversion_id: owConvId,
    p_payout_usd: 5.0,
    p_payload: { cleanup: true },
  });

  const { data: finalProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('available_points')
    .eq('id', testUserId)
    .single();
  test('Final ledger & balance strictly reconciled', Number(finalProfile.available_points) === initialPoints, `Points: ${finalProfile.available_points}`);

  console.log('\n==============================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==============================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
