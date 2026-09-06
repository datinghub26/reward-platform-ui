# RewardNova — GPT Platform UI

Phase 02 UI prototype for the GPT rewards platform.

## Stack
- Next.js
- TypeScript
- React
- Responsive CSS
- No database/auth/provider integration yet

## Run
```bash
npm install
npm run dev
```

Open http://localhost:3000

## Current pages
- `/` — public homepage
- `/login` — login UI
- `/register` — registration UI
- `/dashboard` — dashboard prototype
- `/earn` — single offer-wall marketplace for all earning categories
- `/offers/featured-offer` — offer detail example
- `/offers/consumer-survey` — survey detail example
- `/offers/game-quest` — game detail example

## Important
The offer data is mock UI data. Real offer providers, tracking links,
authentication, postbacks, wallet ledger, referrals, and withdrawals are
intentionally deferred to later phases.

## Navigation decision

Surveys, Games, Apps and Rewards are not separate primary sections. Offer-wall categories are handled inside `/earn`.


## Current member navigation

Dashboard, Earn, Leaderboard, Profile and Support. Referrals are intentionally excluded from the current MVP navigation.


## Authentication UI

Login, registration, password recovery and restricted account state are implemented as UI-only screens. No email verification is required; users can sign in immediately after registration. Real authentication is Phase 03.

## Phase 03.1 — Backend Foundation

The project now contains the first Supabase/PostgreSQL foundation:

- `user_profiles`
- `offers`
- `offer_clicks`
- `conversions`
- `reward_ledger`
- `activity_log`
- `support_tickets`

Withdrawals are intentionally not included yet.

The SQL migration enables RLS and keeps provider conversion/reward writes out of the normal user role. Supabase Auth remains responsible for credentials and sessions.

Before connecting the application, copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key.

## Phase 03.2 — Real Register/Login

The UI now uses Supabase Auth for email/password registration and login.

- Registration: email + password + confirm password
- No email verification in the intended RewardNova flow
- Login redirects to `/dashboard`
- Protected member routes redirect unauthenticated users to `/login`
- Authenticated users are redirected away from `/login` and `/register`
- Sign out is available in the member sidebar
- `user_profiles` is automatically created by the database trigger after signup

**Supabase setting required:** Authentication → Providers → Email → disable **Confirm email**. With Confirm email disabled, Supabase returns a session immediately after signup, which is required for the direct-to-dashboard flow.

## Phase 03.3 — Real Dashboard + User Profile Data

The dashboard and profile pages now read authenticated user data from Supabase:

- `user_profiles` provides available, pending and lifetime points
- Dashboard greeting uses the authenticated user's email/display name
- Dashboard activity reads `activity_log`
- Dashboard account status reads `user_profiles.status`
- Profile reads the authenticated user's email and profile/balance fields
- Demo reward/activity values were removed
- Empty accounts now show a clean zero-state

No reward balance can be changed from these pages. Reward changes remain a backend/ledger operation.

## Phase 03.4 — Real Earn Offer Wall + Offers Database

The `/earn` page is now database-driven.

- Active offers are loaded from `public.offers`.
- Offer filters/search/sorting run against database results.
- Offer details load the selected database row.
- Offer clicks are created canonically via the secure PostgreSQL RPC `create_offer_click`, which validates the authenticated user and active offer, records `offer_clicks`, and prevents client-side tampering.
- Country/device restrictions are checked before a click is recorded.
- Demo offers are provided by `002_real_offer_wall.sql` using `https://example.com/`; replace those URLs with real provider tracking URLs before production traffic.
- Reward balances are still read-only on the frontend. Conversion/postback and reward-ledger processing remain backend work.

Run migration `002_real_offer_wall.sql` in Supabase SQL Editor before testing the new offer wall.

## Phase 03.4 Click Tracking Foundation

Offer tracking URLs are resolved server-side. Supported placeholders:
`{click_id}`, `{user_id}`, `{offer_id}`.

When a user starts an offer, RewardNova validates the session, account status,
offer status, GEO and device eligibility, creates an `offer_clicks` row, resolves
the tracking URL, and returns the resolved destination.

Clicks do not award points. Conversion validation and reward crediting will be
handled by the later postback/reward engine.

## Phase 03.4 — Supabase Offer Marketplace

The `/earn` page reads active offers from `public.offers`. Offer categories are derived from the database, so the UI does not hard-code Games, Signups, or other sections.

The offer detail page uses `reward_usd` from the database and starts offers securely through the `create_offer_click` RPC.

If users were registered before the RewardNova profile trigger was installed, run `supabase/migrations/004_backfill_existing_profiles.sql` once to create their missing `user_profiles` rows.


## Phase 04 — Conversion & Reward Engine

The postback endpoint is:

`POST /api/postback`

Authentication:
- `x-postback-secret: <POSTBACK_SECRET>` header, or
- `?token=<POSTBACK_SECRET>` query parameter.

Accepted click ID parameters:
`click_id`, `clickid`, `subid`, `sub_id`.

Accepted status values include approved/completed/success, pending, rejected,
and reversed/chargeback.

Approved conversions are processed atomically in PostgreSQL:
1. locate and lock the click
2. locate and lock the user/offer
3. create the conversion
4. credit `offer.reward_points`
5. update `user_profiles`
6. create a `reward_ledger` credit
7. add an activity event
8. mark the click as converted

Provider conversion IDs are idempotent, and an approved conversion can only
credit a click once.

IMPORTANT: `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with
`NEXT_PUBLIC_` and never expose it to browser code.
