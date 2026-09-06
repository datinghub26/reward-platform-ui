const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const anonKey = (env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/))[1].trim();
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabaseAdmin = createClient(url, serviceKey);

async function runExtendedTests() {
  console.log('==================================================');
  console.log(' REWARDNOVA — EXTENDED PLATFORM INTEGRATION SUITE');
  console.log('==================================================\n');

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

  // 1. Verify Support Ticket Submission & Retrieval
  const ticketSubject = 'Automated Test Ticket ' + Date.now();
  const { data: ticket, error: ticketErr } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      user_id: testUserId,
      subject: ticketSubject,
      message: 'This is an automated test ticket message.',
      status: 'open'
    })
    .select()
    .single();

  assert('Support ticket created successfully', !ticketErr && ticket?.id, ticketErr?.message);

  const { data: fetchedTickets } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('user_id', testUserId)
    .eq('id', ticket?.id);

  assert('Support ticket retrieved in user ticket list', fetchedTickets?.length === 1 && fetchedTickets[0].subject === ticketSubject);

  // Clean up test ticket
  if (ticket?.id) {
    await supabaseAdmin.from('support_tickets').delete().eq('id', ticket.id);
  }

  // 2. Verify Notifications Lifecycle
  const notifTitle = 'Automated Test Notification ' + Date.now();
  const { data: notif, error: notifErr } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: testUserId,
      type: 'reward',
      title: notifTitle,
      message: 'You received an automated test reward notification.',
      is_read: false
    })
    .select()
    .single();

  assert('Notification created successfully', !notifErr && notif?.id, notifErr?.message);

  const { data: unreadNotifs } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', testUserId)
    .eq('id', notif?.id);

  assert('Notification retrievable in user notification inbox', unreadNotifs?.length === 1 && unreadNotifs[0].title === notifTitle);

  // Clean up test notification
  if (notif?.id) {
    await supabaseAdmin.from('notifications').delete().eq('id', notif.id);
  }

  // 3. Verify Country Match Rule Utility (Pure JS logic)
  function isOfferEligibleForCountry(offerCountryCode, userCountryCode) {
    if (!offerCountryCode) return true;
    const normalizedOffer = offerCountryCode.trim().toUpperCase();
    if (!normalizedOffer || normalizedOffer === 'GLOBAL' || normalizedOffer === 'ALL' || normalizedOffer === 'WORLDWIDE') {
      return true;
    }
    if (!userCountryCode) return false;
    const normalizedUser = userCountryCode.trim().toUpperCase();
    const codes = normalizedOffer.split(/[,|\s/]+/).map(c => c.trim()).filter(Boolean);
    return codes.includes(normalizedUser);
  }
  
  assert('Global offer (country_code null) matches BD', isOfferEligibleForCountry(null, 'BD'));
  assert('Global offer (country_code "ALL") matches BD', isOfferEligibleForCountry('ALL', 'BD'));
  assert('Exact match offer ("BD") matches BD', isOfferEligibleForCountry('BD', 'BD'));
  assert('Comma-delimited offer ("US, CA, BD, GB") matches BD', isOfferEligibleForCountry('US, CA, BD, GB', 'BD'));
  assert('Restricted offer ("US, CA") rejects BD', !isOfferEligibleForCountry('US, CA', 'BD'));
  assert('Lower case match ("bd") matches "BD"', isOfferEligibleForCountry('bd', 'BD'));

  // 4. Verify Leaderboard Points & Profiles
  const { data: topUsers, error: lbErr } = await supabaseAdmin
    .from('user_profiles')
    .select('id, display_name, country_code, available_points, leaderboard_points')
    .order('leaderboard_points', { ascending: false })
    .limit(5);

  assert('Leaderboard profiles queried successfully', !lbErr && topUsers?.length > 0, `Found ${topUsers?.length} users`);
  assert('All top users have verified country codes', topUsers?.every(u => !!u.country_code));

  console.log('\n==================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runExtendedTests().catch(err => {
  console.error(err);
  process.exit(1);
});
