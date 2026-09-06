-- RewardNova Phase 03.4 verification

select id, provider_name, title, status, reward_points,
       countries, devices, tracking_url
from public.offers
where status = 'active'
order by priority desc;

select id, user_id, offer_id, click_id, status, source,
       sub_id, country_code, device_type, clicked_at
from public.offer_clicks
order by clicked_at desc
limit 20;
