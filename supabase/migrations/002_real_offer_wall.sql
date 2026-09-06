-- RewardNova — Phase 03.4 Real Earn Offer Wall
-- Adds offer presentation data and optional demo offers.

alter table public.offers
  add column if not exists icon text not null default '🎁';

create index if not exists idx_offers_status_priority
  on public.offers(status, priority desc, created_at desc);

-- Demo records make the database-driven offer wall immediately testable.
-- Replace their tracking_url values with your actual network tracking URLs
-- before sending production traffic.
insert into public.offers
  (external_offer_id, provider_name, title, description, category, offer_type,
   status, reward_points, reward_currency, countries, devices, tracking_url,
   terms, featured, popular, priority, icon)
values
  ('demo-featured-01', 'Demo Provider', 'Complete a featured activity',
   'Complete the qualifying steps listed by the provider and wait for verification.',
   'CPA', 'CPA', 'active', 25000, 25.00, '{US}', '{Mobile}',
   'https://example.com/', 'Demo offer only. Replace with your provider terms.', true, true, 100, '🎁'),
  ('demo-survey-01', 'Demo Surveys', 'Consumer opinion survey',
   'Share your opinions in a qualifying market research survey.',
   'Surveys', 'Survey', 'active', 4000, 4.00, '{US}', '{Desktop,Mobile,Tablet}',
   'https://example.com/', 'Demo survey. Replace with your provider terms.', false, true, 90, '📋'),
  ('demo-game-01', 'Demo Games', 'Reach a game milestone',
   'Install the participating game and complete the listed milestones.',
   'Games', 'Game', 'active', 15000, 15.00, '{US}', '{Mobile}',
   'https://example.com/', 'Demo game. Replace with your provider terms.', false, true, 80, '🎮'),
  ('demo-app-01', 'Demo Apps', 'Try a participating app',
   'Install a participating app and complete the qualifying action.',
   'Apps', 'CPI', 'active', 8500, 8.50, '{US}', '{Mobile}',
   'https://example.com/', 'Demo app. Replace with your provider terms.', false, false, 70, '📱'),
  ('demo-signup-01', 'Demo Offers', 'Join a participating service',
   'Complete the participating service signup requirements.',
   'Signups', 'CPL', 'active', 6000, 6.00, '{US}', '{Desktop}',
   'https://example.com/', 'Demo signup. Replace with your provider terms.', false, false, 60, '✨'),
  ('demo-uk-01', 'Demo Offers', 'UK service signup',
   'Join an eligible participating service and complete its qualifying action.',
   'Signups', 'CPL', 'active', 10500, 10.50, '{UK}', '{Desktop,Mobile}',
   'https://example.com/', 'Demo UK offer. Replace with your provider terms.', false, true, 50, '🇬🇧'),
  ('demo-ca-01', 'Demo Apps', 'Try a mobile app',
   'Install a participating app and complete the provider action.',
   'Apps', 'CPI', 'active', 7200, 7.20, '{CA}', '{Mobile}',
   'https://example.com/', 'Demo CA offer. Replace with your provider terms.', false, false, 40, '🍁')
on conflict (provider_name, external_offer_id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  offer_type = excluded.offer_type,
  status = excluded.status,
  reward_points = excluded.reward_points,
  reward_currency = excluded.reward_currency,
  countries = excluded.countries,
  devices = excluded.devices,
  tracking_url = excluded.tracking_url,
  terms = excluded.terms,
  featured = excluded.featured,
  popular = excluded.popular,
  priority = excluded.priority,
  icon = excluded.icon,
  updated_at = now();

-- Keep ordinary users from changing offer definitions.
-- The foundation migration already grants SELECT only to authenticated users.
