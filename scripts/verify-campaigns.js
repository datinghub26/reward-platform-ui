const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const urlMatch = envText.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function runTests() {
  console.log("==================================================");
  console.log(" REWARDNOVA — CAMPAIGNS & SUPPORT TICKETS TEST SUITE");
  console.log("==================================================\n");

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

  // 1. Test data/campaigns.json file integrity
  const campaignsFile = path.join(__dirname, '..', 'data', 'campaigns.json');
  assert('data/campaigns.json exists', fs.existsSync(campaignsFile));
  
  const rawCampaigns = JSON.parse(fs.readFileSync(campaignsFile, 'utf8'));
  const campaignsList = rawCampaigns.campaigns || [];
  assert('Campaigns array loaded and non-empty', Array.isArray(campaignsList) && campaignsList.length > 0, `Count: ${campaignsList.length}`);
  
  const sampleCamp = campaignsList[0];
  assert('Campaign has valid structure', Boolean(sampleCamp && sampleCamp.id && sampleCamp.title && typeof sampleCamp.multiplier === 'number'));

  // 2. Test data/campaign-users.json file integrity
  const campUsersFile = path.join(__dirname, '..', 'data', 'campaign-users.json');
  assert('data/campaign-users.json exists', fs.existsSync(campUsersFile));
  
  const rawCampUsers = JSON.parse(fs.readFileSync(campUsersFile, 'utf8'));
  const participantsList = rawCampUsers.participants || [];
  assert('Campaign users array loaded and non-empty', Array.isArray(participantsList) && participantsList.length > 0, `Count: ${participantsList.length}`);

  const sampleUser = participantsList[0];
  assert('Campaign user record has correct fields matching reference', 
    Boolean(sampleUser && sampleUser.id && sampleUser.displayName && sampleUser.campaignTitle && sampleUser.status && typeof sampleUser.rewardPoints === 'number')
  );

  // 3. Test Supabase support_tickets table connection & queries
  const { data: tickets, error: ticketQueryErr } = await supabaseAdmin
    .from('support_tickets')
    .select('id, user_id, subject, status, created_at')
    .limit(5);

  assert('Supabase support_tickets queried without error', !ticketQueryErr, ticketQueryErr ? ticketQueryErr.message : `Found: ${tickets?.length ?? 0}`);

  // 4. Test ticket status transition and verification
  if (tickets && tickets.length > 0) {
    const testTicket = tickets[0];
    const prevStatus = testTicket.status;
    const testNewStatus = prevStatus === 'resolved' ? 'open' : 'resolved';

    const { error: updateErr } = await supabaseAdmin
      .from('support_tickets')
      .update({ status: testNewStatus, updated_at: new Date().toISOString() })
      .eq('id', testTicket.id);

    assert('Ticket status updated successfully in DB', !updateErr, updateErr ? updateErr.message : '');

    // Revert ticket to avoid altering real data permanently
    await supabaseAdmin
      .from('support_tickets')
      .update({ status: prevStatus, updated_at: new Date().toISOString() })
      .eq('id', testTicket.id);
  } else {
    // If no tickets, test insert and delete of a test ticket
    const { data: insertedTicket, error: insertErr } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: 'f24c9a10-0080-4a71-9229-b827ffd1b27c',
        subject: 'Verification Test Ticket',
        message: 'Testing support ticket workflow',
        status: 'open'
      })
      .select()
      .single();

    assert('Ticket creation in Supabase verified', !insertErr && insertedTicket?.id, insertErr?.message);

    if (insertedTicket?.id) {
      await supabaseAdmin.from('support_tickets').delete().eq('id', insertedTicket.id);
    }
  }

  // 5. Verify Brand Cleanliness across newly touched files
  const filesToCheck = [
    'data/campaigns.json',
    'data/campaign-users.json',
    'lib/campaigns.ts',
    'app/admin/campaigns/actions.ts',
    'app/admin/campaigns/CampaignManager.tsx',
    'app/admin/campaigns/page.tsx',
    'app/admin/campaign-users/CampaignUsersList.tsx',
    'app/admin/campaign-users/page.tsx',
    'app/admin/tickets/actions.ts',
    'app/admin/tickets/TicketManager.tsx',
    'app/admin/tickets/page.tsx',
    'components/admin/AdminSidebar.tsx',
    'app/admin/layout.tsx'
  ];

  let brandErrors = 0;
  for (const relPath of filesToCheck) {
    const fullPath = path.join(__dirname, '..', relPath);
    if (!fs.existsSync(fullPath)) {
      assert(`File exists: ${relPath}`, false, 'File not found');
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    if (/offerverse/i.test(content) || /earnrewardcash/i.test(content)) {
      brandErrors++;
      console.error(`❌ BRAND VIOLATION in ${relPath}`);
    }
  }
  assert('Zero OfferVerse / earnrewardcash brand leaks in Phase 14 files', brandErrors === 0, `Violations: ${brandErrors}`);

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
