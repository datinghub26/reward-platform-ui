const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('REWARDNOVA - PHASE 15 REWARDS & LOGS VERIFICATION');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

// 1. Levels Configuration & Progression
console.log('--- 1. Levels Engine Configuration ---');
const levelsConfigPath = path.join(__dirname, '..', 'data', 'levels-config.json');
assert(fs.existsSync(levelsConfigPath), 'data/levels-config.json exists');

try {
  const raw = fs.readFileSync(levelsConfigPath, 'utf8');
  const data = JSON.parse(raw);
  const levels = data.levels;
  assert(Array.isArray(levels) && levels.length >= 10, `Levels configured: ${levels.length} tiers (min 10)`);
  
  const hasBronze = levels.some(l => l.level === 1 && l.title.toLowerCase().includes('bronze'));
  const hasChampion = levels.some(l => l.level === 10);
  assert(hasBronze, 'Level 1 is Bronze tier');
  assert(hasChampion, 'Level 10 is Cosmic Champion tier');
  
  // Verify progressive ordering
  let ascending = true;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].requiredPoints <= levels[i - 1].requiredPoints) ascending = false;
  }
  assert(ascending, 'Levels are strictly ordered ascending by requiredPoints');

  // Verify fields
  const allFields = levels.every(l => 
    typeof l.level === 'number' && 
    typeof l.title === 'string' && 
    typeof l.requiredPoints === 'number' && 
    typeof l.multiplierBonus === 'number' && 
    typeof l.rewardPoints === 'number' &&
    typeof l.badgeColor === 'string'
  );
  assert(allFields, 'All level objects contain valid typed fields (level, title, requiredPoints, multiplierBonus, rewardPoints, badgeColor)');
} catch (e) {
  assert(false, `Failed to parse levels-config.json: ${e.message}`);
}

// 2. Ranks & Leaderboard Configuration
console.log('\n--- 2. Leaderboard & Ranks Configuration ---');
const leaderboardConfigPath = path.join(__dirname, '..', 'data', 'leaderboard-config.json');
assert(fs.existsSync(leaderboardConfigPath), 'data/leaderboard-config.json exists');

try {
  const lbConfig = JSON.parse(fs.readFileSync(leaderboardConfigPath, 'utf8'));
  assert(lbConfig.prizePoolEnabled === true, 'Leaderboard prize pool is enabled');
  assert(Array.isArray(lbConfig.prizes) && lbConfig.prizes.length >= 10, `Prizes defined for top 10 (${lbConfig.prizes.length} ranks)`);
  assert(lbConfig.prizes[0].rank === 1 && lbConfig.prizes[0].rewardPoints >= 25000, `1st place prize is generous (${lbConfig.prizes[0].rewardPoints} pts)`);
  assert(typeof lbConfig.totalPrizePoints === 'number' && lbConfig.totalPrizePoints > 0, `Total prize pool calculated: ${lbConfig.totalPrizePoints} pts`);
  assert(['daily', 'weekly', 'biweekly', 'monthly'].includes(lbConfig.resetFrequency), `Valid competition cadence: ${lbConfig.resetFrequency}`);
} catch (e) {
  assert(false, `Failed to parse leaderboard-config.json: ${e.message}`);
}

// 3. Daily Streaks Configuration
console.log('\n--- 3. Daily Streaks Configuration ---');
const streaksConfigPath = path.join(__dirname, '..', 'data', 'streaks-config.json');
assert(fs.existsSync(streaksConfigPath), 'data/streaks-config.json exists');

try {
  const streaksConfig = JSON.parse(fs.readFileSync(streaksConfigPath, 'utf8'));
  assert(streaksConfig.enabled === true, 'Daily Streaks system is enabled');
  assert(Array.isArray(streaksConfig.streakDays) && streaksConfig.streakDays.length === 7, '7-Day Streak schedule configured');
  assert(streaksConfig.streakDays[6].bonusPoints > streaksConfig.streakDays[0].bonusPoints, 'Streak rewards increase progressively (Day 7 > Day 1)');
  assert(streaksConfig.minDailyPoints > 0, `Minimum daily qualification threshold set: ${streaksConfig.minDailyPoints} pts`);
} catch (e) {
  assert(false, `Failed to parse streaks-config.json: ${e.message}`);
}

// 4. Bonuses & Promo Codes Store
console.log('\n--- 4. Bonuses & Promo Codes Store ---');
const promoCodesPath = path.join(__dirname, '..', 'data', 'promo-codes.json');
assert(fs.existsSync(promoCodesPath), 'data/promo-codes.json exists');

try {
  const promoData = JSON.parse(fs.readFileSync(promoCodesPath, 'utf8'));
  const promoCodes = promoData.codes;
  assert(Array.isArray(promoCodes) && promoCodes.length >= 1, `Promo vouchers active in store: ${promoCodes.length}`);
  const validCodes = promoCodes.every(c => 
    typeof c.id === 'string' &&
    typeof c.code === 'string' &&
    typeof c.rewardPoints === 'number' &&
    typeof c.maxUses === 'number' &&
    typeof c.usedCount === 'number' &&
    typeof c.active === 'boolean'
  );
  assert(validCodes, 'All promo codes have valid structured fields (id, code, rewardPoints, maxUses, usedCount, active)');
} catch (e) {
  assert(false, `Failed to parse promo-codes.json: ${e.message}`);
}

// 5. System & Audit Logs
console.log('\n--- 5. System & Audit Logs ---');
const auditLogsPath = path.join(__dirname, '..', 'data', 'audit-logs.json');
assert(fs.existsSync(auditLogsPath), 'data/audit-logs.json exists');

try {
  const logsData = JSON.parse(fs.readFileSync(auditLogsPath, 'utf8'));
  assert(Array.isArray(logsData.logs), `Audit logs store parsed: ${logsData.logs.length} entries`);
  if (logsData.logs.length > 0) {
    const entry = logsData.logs[0];
    assert(entry.id && entry.action && entry.timestamp && entry.category, 'Audit log entry has id, action, timestamp, category');
  }
} catch (e) {
  assert(false, `Failed to parse audit-logs.json: ${e.message}`);
}

// 6. Platform Settings 9 Tabs Validation
console.log('\n--- 6. Settings 9-Tab Architecture ---');
const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
assert(fs.existsSync(settingsPath), 'data/settings.json exists');

try {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  
  // Tab 1: Protection
  assert(typeof settings.enableMaxAccounts === 'boolean' && typeof settings.maxAccountsPerIp === 'number', 'Tab 1: Protection settings present');
  // Tab 2: Postback
  assert(typeof settings.enablePendingLeads === 'boolean' && typeof settings.pendingPointsThreshold === 'number', 'Tab 2: Postback settings present');
  // Tab 3: Third Party
  assert(typeof settings.fraudLabsApiKey === 'string' && typeof settings.googleRecaptchaSiteKey === 'string', 'Tab 3: Third Party settings present');
  // Tab 4: Referral
  assert(typeof settings.enableReferrals === 'boolean' && typeof settings.referralCommissionRate === 'number', 'Tab 4: Referral settings present');
  // Tab 5: Levels
  assert(typeof settings.enableAutoLeveling === 'boolean' && typeof settings.levelXpMultiplier === 'number', 'Tab 5: Levels settings present');
  // Tab 6: Leaderboard
  assert(typeof settings.leaderboardAutoReset === 'boolean' && typeof settings.leaderboardResetPeriod === 'string', 'Tab 6: Leaderboard settings present');
  // Tab 7: Streaks
  assert(typeof settings.streakAutoAward === 'boolean' && typeof settings.streakGracePeriodHours === 'number', 'Tab 7: Streaks settings present');
  // Tab 8: Social Media
  assert(typeof settings.discordUrl === 'string' && typeof settings.socialFollowRewardPoints === 'number', 'Tab 8: Social Media settings present');
  // Tab 9: Notification Tone
  assert(typeof settings.notificationToneUrl === 'string' && typeof settings.toneFileName === 'string', 'Tab 9: Notification Tone settings present');
} catch (e) {
  assert(false, `Failed to parse settings.json: ${e.message}`);
}

// 7. Route Files Existence Check
console.log('\n--- 7. Route & Component Architecture ---');
const requiredFiles = [
  'app/admin/levels/page.tsx',
  'app/admin/levels/LevelsManager.tsx',
  'app/admin/levels/actions.ts',
  'app/admin/ranks/page.tsx',
  'app/admin/ranks/RanksManager.tsx',
  'app/admin/ranks/actions.ts',
  'app/admin/streaks/page.tsx',
  'app/admin/streaks/StreaksManager.tsx',
  'app/admin/streaks/actions.ts',
  'app/admin/bonuses/page.tsx',
  'app/admin/bonuses/BonusesManager.tsx',
  'app/admin/bonuses/actions.ts',
  'app/admin/logs/page.tsx',
  'app/admin/logs/LogsManager.tsx',
  'lib/levels.ts',
  'lib/leaderboard.ts',
  'lib/streaks.ts',
  'lib/bonuses.ts',
  'lib/audit-logger.ts',
  'lib/settings.ts',
  'components/admin/AdminSidebar.tsx'
];

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  assert(fs.existsSync(fullPath), `File exists: ${file}`);
});

// 8. Brand Integrity Check
console.log('\n--- 8. Brand Integrity & Anti-Leak Check ---');
const filesToScan = requiredFiles.map(f => path.join(__dirname, '..', f));

let leakDetected = false;
filesToScan.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.toLowerCase().includes('offerverse')) {
    console.error(`  [LEAK] "OfferVerse" detected in ${path.relative(path.join(__dirname, '..'), filePath)}`);
    leakDetected = true;
  }
  if (content.toLowerCase().includes('earnrewardcash')) {
    console.error(`  [LEAK] "earnrewardcash" detected in ${path.relative(path.join(__dirname, '..'), filePath)}`);
    leakDetected = true;
  }
});

assert(!leakDetected, 'Zero brand leaks ("OfferVerse", "earnrewardcash") across all Phase 15 files');

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 15 REWARDS & LOGS AUDITS PASSED SUCCESSFULLY!');
}
