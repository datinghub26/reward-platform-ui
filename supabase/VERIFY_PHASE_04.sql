-- RewardNova Phase 04 verification

-- Latest conversions
select
  id,
  click_id,
  user_id,
  offer_id,
  provider_name,
  provider_conversion_id,
  status,
  payout_usd,
  reward_points,
  created_at
from public.conversions
order by created_at desc
limit 20;

-- Latest rewards
select
  id,
  user_id,
  conversion_id,
  entry_type,
  points,
  balance_after,
  description,
  created_at
from public.reward_ledger
order by created_at desc
limit 20;

-- User balances
select
  id,
  display_name,
  available_points,
  pending_points,
  lifetime_points,
  leaderboard_points
from public.user_profiles
order by created_at desc;
