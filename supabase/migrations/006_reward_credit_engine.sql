-- ============================================================
-- RewardNova — Phase 05.4.1
-- Reward Credit Safety / Idempotency
-- ============================================================

-- Prevent more than one credit entry for the same conversion.
create unique index if not exists idx_reward_ledger_one_credit_per_conversion
  on public.reward_ledger(conversion_id)
  where entry_type = 'credit'
    and conversion_id is not null;


-- Helpful index for reward history.
create index if not exists idx_reward_ledger_user_created
  on public.reward_ledger(user_id, created_at desc);


-- Helpful index for conversion lookup.
create index if not exists idx_reward_ledger_conversion
  on public.reward_ledger(conversion_id)
  where conversion_id is not null;


-- ============================================================
-- Done
-- ============================================================