-- ============================================================
-- RewardNova — Phase 04
-- Conversion + Reward Engine
-- ============================================================

-- Idempotency for provider callbacks.
create unique index if not exists idx_conversions_provider_conversion
  on public.conversions(provider_name, provider_conversion_id)
  where provider_conversion_id is not null;

-- A single approved conversion per click protects against duplicate rewards.
create unique index if not exists idx_one_approved_conversion_per_click
  on public.conversions(click_id)
  where status = 'approved';

-- ------------------------------------------------------------
-- Atomic postback processor
-- ------------------------------------------------------------

create or replace function public.process_offer_postback(
  p_click_id text,
  p_status text default 'approved',
  p_provider_name text default null,
  p_provider_conversion_id text default null,
  p_payout_usd numeric default 0,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_click public.offer_clicks%rowtype;
  v_offer public.offers%rowtype;
  v_conversion public.conversions%rowtype;
  v_profile public.user_profiles%rowtype;
  v_normalized_status text;
  v_reward bigint;
  v_new_balance bigint;
begin
  if nullif(trim(p_click_id), '') is null then
    raise exception using
      errcode = '22023',
      message = 'click_id is required';
  end if;

  v_normalized_status := lower(coalesce(trim(p_status), 'approved'));

  if v_normalized_status in ('1', 'ok', 'success', 'complete', 'completed', 'approved', 'converted') then
    v_normalized_status := 'approved';
  elsif v_normalized_status in ('0', 'pending', 'hold') then
    v_normalized_status := 'pending';
  elsif v_normalized_status in ('rejected', 'declined', 'invalid', 'failed') then
    v_normalized_status := 'rejected';
  elsif v_normalized_status in ('reversed', 'chargeback', 'cancelled', 'canceled') then
    v_normalized_status := 'reversed';
  else
    raise exception using
      errcode = '22023',
      message = 'Unsupported conversion status';
  end if;

  -- Idempotency: return an existing provider conversion when available.
  if p_provider_conversion_id is not null then
    select *
      into v_conversion
      from public.conversions
     where provider_name is not distinct from p_provider_name
       and provider_conversion_id = p_provider_conversion_id
     for update;

    if found then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'conversion_id', v_conversion.id,
        'status', v_conversion.status,
        'reward_points', v_conversion.reward_points
      );
    end if;
  end if;

  -- Lock the click so two callbacks cannot credit it simultaneously.
  select *
    into v_click
    from public.offer_clicks
   where click_id = p_click_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Unknown click_id';
  end if;

  select *
    into v_offer
    from public.offers
   where id = v_click.offer_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Offer for click_id was not found';
  end if;

  select *
    into v_profile
    from public.user_profiles
   where id = v_click.user_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'User profile for click_id was not found';
  end if;

  -- If this click was already approved, do not award it again.
  if v_normalized_status = 'approved' then
    select *
      into v_conversion
      from public.conversions
     where click_id = p_click_id
       and status = 'approved'
     order by created_at asc
     limit 1
     for update;

    if found then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'conversion_id', v_conversion.id,
        'status', v_conversion.status,
        'reward_points', v_conversion.reward_points
      );
    end if;
  end if;

  v_reward := greatest(coalesce(v_offer.reward_points, 0), 0);

  insert into public.conversions (
    click_id,
    user_id,
    offer_id,
    provider_name,
    provider_conversion_id,
    status,
    payout_usd,
    reward_points,
    postback_payload
  )
  values (
    p_click_id,
    v_click.user_id,
    v_click.offer_id,
    p_provider_name,
    p_provider_conversion_id,
    v_normalized_status,
    greatest(coalesce(p_payout_usd, 0), 0),
    v_reward,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning * into v_conversion;

  if v_normalized_status = 'approved' then
    v_new_balance := v_profile.available_points + v_reward;

    update public.user_profiles
       set available_points = v_new_balance,
           lifetime_points = lifetime_points + v_reward,
           leaderboard_points = leaderboard_points + v_reward
     where id = v_profile.id;

    insert into public.reward_ledger (
      user_id,
      conversion_id,
      entry_type,
      points,
      balance_after,
      description
    )
    values (
      v_profile.id,
      v_conversion.id,
      'credit',
      v_reward,
      v_new_balance,
      'Reward for completed offer: ' || v_offer.title
    );

    update public.offer_clicks
       set status = 'converted',
           converted_at = now()
     where id = v_click.id;

    insert into public.activity_log (
      user_id,
      event_type,
      title,
      description,
      points_delta
    )
    values (
      v_profile.id,
      'reward_credited',
      'Reward credited',
      v_offer.title,
      v_reward
    );

  elsif v_normalized_status = 'rejected' then
    update public.offer_clicks
       set status = 'rejected'
     where id = v_click.id;

  elsif v_normalized_status = 'reversed' then
    update public.offer_clicks
       set status = 'expired'
     where id = v_click.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'conversion_id', v_conversion.id,
    'status', v_conversion.status,
    'reward_points', case
      when v_normalized_status = 'approved' then v_reward
      else 0
    end,
    'user_id', v_profile.id,
    'offer_id', v_offer.id
  );
end;
$$;

revoke all on function public.process_offer_postback(
  text, text, text, text, numeric, jsonb
) from public;

-- The Next.js server uses the service role for this operation.
grant execute on function public.process_offer_postback(
  text, text, text, text, numeric, jsonb
) to service_role;

-- ============================================================
-- Done
-- ============================================================
