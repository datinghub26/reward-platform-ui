-- RewardNova — Phase 03.4 Click Tracking Foundation
-- Supported tracking URL placeholders:
--   {click_id}, {user_id}, {offer_id}

alter table public.offers
  add column if not exists tracking_notes text;

alter table public.offer_clicks
  add column if not exists redirect_url text;

create index if not exists idx_offer_clicks_user_offer
  on public.offer_clicks(user_id, offer_id, clicked_at desc);

create index if not exists idx_offer_clicks_status
  on public.offer_clicks(status, clicked_at desc);
