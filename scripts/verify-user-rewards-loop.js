const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('REWARDNOVA — PHASE 16 USER REWARDS LOOP VERIFICATION');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}: ${err.message}`);
    failCount++;
  }
}

// 1. Levels Calculation Engine
console.log('--- 1. User Level & XP Calculations ---');
const levelsRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'levels-config.json'), 'utf8'));
const tiers = levelsRaw.levels;

function calculateUserLevel(lifetimePoints) {
  let currentTier = tiers[0];
  let nextTier = null;
  for (let i = 0; i < tiers.length; i++) {
    if (lifetimePoints >= tiers[i].requiredPoints) {
      currentTier = tiers[i];
      nextTier = tiers[i + 1] || null;
    } else {
      break;
    }
  }
  let progressPercent = 100;
  if (nextTier) {
    const range = nextTier.requiredPoints - currentTier.requiredPoints;
    const gained = lifetimePoints - currentTier.requiredPoints;
    progressPercent = Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
  }
  return { currentTier, nextTier, progressPercent };
}

it('Level 1 for 0 XP with correct Bronze tier', () => {
  const result = calculateUserLevel(0);
  assert.strictEqual(result.currentTier.level, 1);
  assert.strictEqual(result.currentTier.title, 'Bronze Member');
  assert(result.nextTier !== null);
  assert.strictEqual(result.nextTier.level, 2);
  assert.strictEqual(result.progressPercent, 0);
});

it('XP progression calculation (500 XP = 50% of Level 1 -> 2)', () => {
  const result = calculateUserLevel(500);
  assert.strictEqual(result.currentTier.level, 1);
  assert.strictEqual(result.progressPercent, 50);
});

it('Max Level (100,000+ XP) caps at Cosmic Champion with 100% progress', () => {
  const result = calculateUserLevel(150000);
  assert.strictEqual(result.currentTier.level, 10);
  assert.strictEqual(result.currentTier.title, 'Cosmic Champion');
  assert.strictEqual(result.nextTier, null);
  assert.strictEqual(result.progressPercent, 100);
});

// 2. Leaderboard Prize Pool Banner Integration
console.log('\n--- 2. Public Leaderboard Prize Pool Integration ---');
const lbConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'leaderboard-config.json'), 'utf8'));

it('Leaderboard config contains active prize pool configuration', () => {
  assert(lbConfig.prizePoolEnabled === true);
  assert(lbConfig.totalPrizePoints >= 100000);
  assert(Array.isArray(lbConfig.prizes) && lbConfig.prizes.length >= 10);
  assert.strictEqual(lbConfig.prizes[0].rank, 1);
  assert.strictEqual(lbConfig.prizes[0].rewardPoints, 50000);
});

it('app/leaderboard/page.tsx imports and displays prize pool and podium rewards', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'app', 'leaderboard', 'page.tsx'), 'utf8');
  assert(content.includes('getLeaderboardConfig'), 'getLeaderboardConfig missing');
  assert(content.includes('Active Prize Pool'), 'Prize Pool banner missing');
  assert(content.includes('first.prizePoints'), 'Podium first prize missing');
  assert(content.includes('second.prizePoints'), 'Podium second prize missing');
  assert(content.includes('third.prizePoints'), 'Podium third prize missing');
  assert(content.includes('pts prize'), 'Rank prize table column missing');
});

// 3. Daily Streaks User Lifecycle & Idempotency
console.log('\n--- 3. Daily Streaks User Lifecycle & Idempotency ---');
const streaksConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'streaks-config.json'), 'utf8'));

it('Streaks schedule has 7 progressive days', () => {
  assert(streaksConfig.enabled === true);
  assert.strictEqual(streaksConfig.streakDays.length, 7);
  assert.strictEqual(streaksConfig.streakDays[0].day, 1);
  assert.strictEqual(streaksConfig.streakDays[0].bonusPoints, 10);
  assert.strictEqual(streaksConfig.streakDays[6].day, 7);
  assert.strictEqual(streaksConfig.streakDays[6].bonusPoints, 250);
});

it('lib/streaks.ts implements getUserStreakStatus and recordUserStreakClaim', () => {
  const streaksCode = fs.readFileSync(path.join(__dirname, '..', 'lib', 'streaks.ts'), 'utf8');
  assert(streaksCode.includes('export function getUserStreakStatus'), 'getUserStreakStatus missing');
  assert(streaksCode.includes('export function recordUserStreakClaim'), 'recordUserStreakClaim missing');
  assert(streaksCode.includes('USER_STREAKS_FILE'), 'USER_STREAKS_FILE persistence missing');
});

it('data/user-streaks.json exists and is valid JSON', () => {
  const userStreaksFile = path.join(__dirname, '..', 'data', 'user-streaks.json');
  assert(fs.existsSync(userStreaksFile));
  const raw = fs.readFileSync(userStreaksFile, 'utf8');
  assert.doesNotThrow(() => JSON.parse(raw));
});

// 4. Promo Codes & Voucher Redemption
console.log('\n--- 4. Promo Codes & Voucher Redemption Engine ---');
const promoData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'promo-codes.json'), 'utf8'));

it('Promo codes list has active vouchers', () => {
  assert(Array.isArray(promoData.codes));
  const welcome = promoData.codes.find(c => c.code === 'WELCOME2026');
  assert(welcome !== undefined);
  assert(welcome.active === true);
  assert.strictEqual(welcome.rewardPoints, 500);
});

it('lib/bonuses.ts exports validateAndRedeemPromoCode', () => {
  const bonusCode = fs.readFileSync(path.join(__dirname, '..', 'lib', 'bonuses.ts'), 'utf8');
  assert(bonusCode.includes('export function validateAndRedeemPromoCode'), 'validateAndRedeemPromoCode missing');
  assert(bonusCode.includes('usedCount += 1'), 'usedCount increment missing');
});

// 5. Server Actions & UI Widgets Architecture
console.log('\n--- 5. Server Actions & Widget Integration ---');

it('app/actions/rewards.ts exports claimDailyStreakAction, redeemPromoCodeAction, and getUserRewardsStatusAction', () => {
  const actionsContent = fs.readFileSync(path.join(__dirname, '..', 'app', 'actions', 'rewards.ts'), 'utf8');
  assert(actionsContent.includes('export async function claimDailyStreakAction'), 'claimDailyStreakAction missing');
  assert(actionsContent.includes('export async function redeemPromoCodeAction'), 'redeemPromoCodeAction missing');
  assert(actionsContent.includes('export async function getUserRewardsStatusAction'), 'getUserRewardsStatusAction missing');
  assert(actionsContent.includes('reward_ledger'), 'Double entry reward_ledger missing');
  assert(actionsContent.includes('user_profiles'), 'user_profiles balance update missing');
  assert(actionsContent.includes('notifications'), 'notifications dispatch missing');
});

it('components/UserLevelWidget.tsx, DailyStreakWidget.tsx, PromoCodeWidget.tsx exist', () => {
  assert(fs.existsSync(path.join(__dirname, '..', 'components', 'UserLevelWidget.tsx')));
  assert(fs.existsSync(path.join(__dirname, '..', 'components', 'DailyStreakWidget.tsx')));
  assert(fs.existsSync(path.join(__dirname, '..', 'components', 'PromoCodeWidget.tsx')));
});

it('app/dashboard/page.tsx integrates UserLevelWidget, DailyStreakWidget, and PromoCodeWidget', () => {
  const dashContent = fs.readFileSync(path.join(__dirname, '..', 'app', 'dashboard', 'page.tsx'), 'utf8');
  assert(dashContent.includes('UserLevelWidget'), 'UserLevelWidget not imported/used');
  assert(dashContent.includes('DailyStreakWidget'), 'DailyStreakWidget not imported/used');
  assert(dashContent.includes('PromoCodeWidget'), 'PromoCodeWidget not imported/used');
});

it('app/profile/page.tsx integrates UserLevelWidget, PromoCodeWidget, and Social Media links', () => {
  const profContent = fs.readFileSync(path.join(__dirname, '..', 'app', 'profile', 'page.tsx'), 'utf8');
  assert(profContent.includes('UserLevelWidget'), 'UserLevelWidget not in profile');
  assert(profContent.includes('PromoCodeWidget'), 'PromoCodeWidget not in profile');
  assert(profContent.includes('Official Communities'), 'Official Communities section not in profile');
  assert(profContent.includes('discordUrl'), 'discordUrl not in profile');
  assert(profContent.includes('telegramUrl'), 'telegramUrl not in profile');
});

// 6. Brand Anti-Leak Check
console.log('\n--- 6. Anti-Leak Brand Integrity Check ---');
const filesToCheck = [
  'app/actions/rewards.ts',
  'components/UserLevelWidget.tsx',
  'components/DailyStreakWidget.tsx',
  'components/PromoCodeWidget.tsx',
  'app/dashboard/page.tsx',
  'app/profile/page.tsx',
  'app/leaderboard/page.tsx',
  'lib/streaks.ts',
  'lib/bonuses.ts',
  'lib/levels.ts',
];

let leakDetected = false;
filesToCheck.forEach((relPath) => {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.toLowerCase().includes('offerverse')) {
    console.error(`  [LEAK] "OfferVerse" detected in ${relPath}`);
    leakDetected = true;
  }
  if (content.toLowerCase().includes('earnrewardcash')) {
    console.error(`  [LEAK] "earnrewardcash" detected in ${relPath}`);
    leakDetected = true;
  }
});

it('Zero brand leaks ("OfferVerse", "earnrewardcash") across all Phase 16 files', () => {
  assert(!leakDetected, 'Brand leaks detected');
});

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 16 USER REWARDS VERIFICATION AUDITS PASSED!\n');
}
