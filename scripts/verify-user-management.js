const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const anonKey = (env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/))[1].trim();
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabaseAnon = createClient(url, anonKey);
const supabaseAdmin = createClient(url, serviceKey);

async function runUserManagementTests() {
  console.log('====================================================');
  console.log(' REWARDNOVA — ADMIN USER MANAGEMENT VERIFICATION');
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

  // 1. Verify Admin User Exists & Has is_admin Privilege
  const { data: adminUsers, error: adminErr } = await supabaseAdmin
    .from('admin_users')
    .select('user_id');
  assert('Admin users table is queryable', !adminErr && adminUsers && adminUsers.length > 0, 'Count: ' + adminUsers?.length);

  const adminUserId = adminUsers[0]?.user_id;
  assert('Admin user id identified', !!adminUserId, 'Admin User ID: ' + adminUserId);

  // 2. Select a target test member user
  const targetUserId = 'f24c9a10-0080-4a71-9229-b827ffd1b27c';
  const { data: initProfile, error: profErr } = await supabaseAdmin
    .from('user_profiles')
    .select('id, available_points, lifetime_points, status, display_name')
    .eq('id', targetUserId)
    .single();

  assert('Target user profile exists', !profErr && !!initProfile, 'User: ' + initProfile?.display_name + ', Initial Points: ' + initProfile?.available_points);

  const initialPoints = Number(initProfile.available_points || 0);
  const initialLifetime = Number(initProfile.lifetime_points || 0);
  const initialStatus = initProfile.status;

  // 3. Test Balance Credit Adjustment (+150 pts)
  const adjustmentAmount = 150;
  const newBalanceExpected = initialPoints + adjustmentAmount;

  const { error: ledgerErr } = await supabaseAdmin.from('reward_ledger').insert({
    user_id: targetUserId,
    conversion_id: null,
    entry_type: 'credit',
    points: adjustmentAmount,
    balance_after: newBalanceExpected,
    description: 'Automated Test: Admin Credit Adjustment',
    created_at: new Date().toISOString(),
  });
  assert('Credit ledger audit entry inserted', !ledgerErr, ledgerErr?.message);

  const { error: updErr } = await supabaseAdmin
    .from('user_profiles')
    .update({
      available_points: newBalanceExpected,
      lifetime_points: initialLifetime + adjustmentAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetUserId);
  assert('User profile balance updated with credit', !updErr, updErr?.message);

  const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
    user_id: targetUserId,
    type: 'reward',
    title: 'Points Credited! 🎁',
    message: 'Admin adjusted your balance by +' + adjustmentAmount + ' points: "Automated Test: Admin Credit Adjustment"',
    is_read: false,
  });
  assert('Credit notification delivered to user', !notifErr, notifErr?.message);

  const { data: credProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('available_points')
    .eq('id', targetUserId)
    .single();
  assert('Profile balance reflects +150 points', credProfile?.available_points === newBalanceExpected, 'Balance: ' + credProfile?.available_points);

  // 4. Test Ledger Reconciliation after Credit
  const { data: ledgerRows } = await supabaseAdmin
    .from('reward_ledger')
    .select('entry_type, points')
    .eq('user_id', targetUserId);
  
  const calculatedSum = ledgerRows.reduce((sum, e) => {
    const pts = Number(e.points);
    if (e.entry_type === 'debit') return sum - Math.abs(pts);
    return sum + pts;
  }, 0);
  assert('Ledger sum reconciles with credited balance', calculatedSum === newBalanceExpected, 'Ledger Sum: ' + calculatedSum + ', Expected: ' + newBalanceExpected);

  // 5. Test Compensating Debit Adjustment (-150 pts)
  const debitAmount = 150;
  const restoredBalance = newBalanceExpected - debitAmount;

  const { error: debitLedgerErr } = await supabaseAdmin.from('reward_ledger').insert({
    user_id: targetUserId,
    conversion_id: null,
    entry_type: 'debit',
    points: debitAmount,
    balance_after: restoredBalance,
    description: 'Automated Test: Admin Debit Compensating Adjustment',
    created_at: new Date().toISOString(),
  });
  assert('Debit ledger audit entry inserted', !debitLedgerErr, debitLedgerErr?.message);

  const { error: debitUpdErr } = await supabaseAdmin
    .from('user_profiles')
    .update({
      available_points: restoredBalance,
      lifetime_points: initialLifetime,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetUserId);
  assert('User profile balance restored via debit', !debitUpdErr, debitUpdErr?.message);

  const { data: ledgerRowsAfterDebit } = await supabaseAdmin
    .from('reward_ledger')
    .select('entry_type, points')
    .eq('user_id', targetUserId);
  
  const restoredLedgerSum = ledgerRowsAfterDebit.reduce((sum, e) => {
    const pts = Number(e.points);
    if (e.entry_type === 'debit') return sum - Math.abs(pts);
    return sum + pts;
  }, 0);
  assert('Ledger sum reconciles after debit to initial balance', restoredLedgerSum === initialPoints, 'Ledger Sum: ' + restoredLedgerSum + ', Initial: ' + initialPoints);

  // Clean up test audit rows and test notification
  await supabaseAdmin.from('reward_ledger').delete().eq('user_id', targetUserId).ilike('description', 'Automated Test: Admin%');
  await supabaseAdmin.from('notifications').delete().eq('user_id', targetUserId).ilike('message', '%Automated Test: Admin%');

  // 6. Test Account Status Controls: Ban and Unban
  const { error: banErr } = await supabaseAdmin
    .from('user_profiles')
    .update({ status: 'banned', updated_at: new Date().toISOString() })
    .eq('id', targetUserId);
  assert('User status updated to banned', !banErr, banErr?.message);

  const { data: bannedProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('status')
    .eq('id', targetUserId)
    .single();
  assert('Banned status verified in DB', bannedProfile?.status === 'banned', 'Status: ' + bannedProfile?.status);

  const { error: unbanErr } = await supabaseAdmin
    .from('user_profiles')
    .update({ status: initialStatus || 'active', updated_at: new Date().toISOString() })
    .eq('id', targetUserId);
  assert('User status restored to active', !unbanErr, unbanErr?.message);

  const { data: activeProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('status')
    .eq('id', targetUserId)
    .single();
  assert('Active status verified in DB', activeProfile?.status === (initialStatus || 'active'), 'Status: ' + activeProfile?.status);

  // 7. Test New User Provisioning & Cleanup
  const testEmail = 'temp_verify_' + Date.now() + '@example.com';
  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: { display_name: 'Test Provisioned User' },
  });
  assert('New user provisioned via Supabase Auth Admin', !createErr && !!newUser?.user?.id, 'New User ID: ' + newUser?.user?.id);

  if (newUser?.user?.id) {
    const { data: newProfile, error: newProfErr } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: newUser.user.id,
        display_name: 'Test Provisioned User',
        status: 'active',
        available_points: 0,
        pending_points: 0,
        lifetime_points: 0,
      })
      .select()
      .single();
    assert('User profile initialized for new user', !newProfErr && !!newProfile, 'Profile ID: ' + newProfile?.id);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    assert('Test user cleaned up cleanly', !delErr, delErr?.message);
  }

  console.log('\n====================================================');
  console.log(' RESULTS: ' + passed + ' PASSED, ' + failed + ' FAILED');
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runUserManagementTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
