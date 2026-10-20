# Zolo campus pivot: audit and plan

Prepared 2026-10-14. **No code has been changed.** Phase 1 is the audit, Phase 2 is the plan. Nothing below gets built until you approve it.

Figures marked **(measured)** come from the code or from a vendor's price page. Figures marked **(estimate)** are mine, with the assumptions stated. Anything I could not determine is marked **UNKNOWN** and listed again in section 7.

---

## 1. Audit

### 1.1 Where places data comes from, and what it costs

**Source.** Google Places, the *legacy* API: Nearby Search, Place Details, Place Photos, plus the Geocoding API. Code: `src/services/providers/google-places-experience-provider.ts`, `google-places-provider.ts`, `composite-experience-provider.ts`. A curated `experiences` table exists (`SupabaseExperienceProvider`), but the code comments say it is empty in production (UNKNOWN: confirm with a row count).

**Live or stored.** Fetched live on every request that is not cached. Nothing from Google is kept in our database on purpose. Caching is Next's data cache only: 1 hour by default, 24 hours on fixed pages, photos through our own proxy with a 6-hour CDN cache (all added 2026-10-12).

**What does get persisted anyway** (this matters for the terms, see below):

| Table | What is stored | Concern |
|---|---|---|
| `saved_experiences` | Google `place_id`, plus `tags` and `category` we derive from Google's `types` | `place_id` is allowed; derived tags are a gray area |
| `itinerary_items` | Title, notes, image URLs (now keyless proxy URLs) taken from Google results | Names and photo references are Google content |
| `user_events` | `place_id` plus metadata (tags, category) | Same gray area as saved |

**Per-call price (measured, Google's pricing page, last updated 2026-10-08):**

| SKU | Price per 1,000 | Free per month | Per call |
|---|---|---|---|
| Nearby Search (legacy, Pro) | $32.00 | 5,000 | $0.032 |
| Place Details (Pro) | $17.00 | 5,000 | $0.017 |
| + Contact data (we request phone, website, hours) | $3.00 | 1,000 | $0.003 |
| + Atmosphere data (we request rating, price, reviews, summary) | $5.00 | 1,000 | $0.005 |
| Place Photos | $7.00 | 1,000 | $0.007 |
| Geocoding | $5.00 | 10,000 | $0.005 |

So one cold **Home or Discover load costs 7 x $0.032 = $0.224**, because the list fans out across 7 place types (`DIVERSITY_TYPES`). A cold place **detail view costs about $0.025**, or about $0.057 with the related-places list. A billed **photo costs $0.007**. A cache hit costs nothing.

Other findings in this area:
- **The Saved page makes one Place Details call per saved place** (`src/app/api/saved/route.ts`, `getById` per row). With "unlimited saves" that is up to dozens of $0.025 calls per cold page view.
- **There is no cost metering anywhere.** Neither Google calls nor Claude token usage are logged, so cost per user cannot be measured today.

**Terms of service (important).** Google's Places policy says you must not pre-fetch, cache or store Places content, except the `place_id` (indefinitely) and lat/lng (temporarily, up to 30 days per the Service Specific Terms). Sources: [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies); the 30-day figure is from the Service Specific Terms as summarized by a third party, so **confirm it in the primary text**. Consequence for your plan: **we cannot serve free browsing from our own database if the data is Google's.** The workable route is a different data source (section 2.A2).

### 1.2 Every place Claude is called

All calls go through `src/ai/client.ts` (`callStructuredTool`), model **`claude-sonnet-5`** ($2 per million input tokens, $10 per million output, from the current price table). The production value of `ANTHROPIC_MODEL` is hidden in Vercel (UNKNOWN); the local value is `claude-sonnet-5`. No prompt caching, no response caching, no usage logging, `maxRetries: 0`.

| Feature | File | Trigger | max_tokens | Tokens in / out (estimate) | Who |
|---|---|---|---|---|---|
| Recommendation reasoning (top 6 candidates) | `src/ai/recommend.ts` | **Only Surprise Me.** Home and Discover pass `useAI: false`, so they use no Claude at all | 1,400 | ~1.5k / ~0.5k | everyone |
| Weekend Planner | `src/ai/weekend-plan.ts` | `POST /api/ai/weekend-plan` | 3,000 | ~2.7k / ~1k | Premium (402 otherwise) |
| Trip Planner | `src/ai/trip-plan.ts` | `POST /api/ai/trip-plan` | 6,000 | ~7k / ~2.5k (5-day trip) | Premium (402 otherwise) |
| Itinerary chat (2 calls: intent, then pick) | `src/ai/itinerary-chat.ts` | `POST /api/itineraries/[id]/chat` | 300 + 200 | ~0.7k / 0.1k, ~0.9k / 0.1k | any owner of an itinerary (no premium check), 20 per minute |

**Cost per call at Sonnet 5 prices (estimate; token counts are mine, not logged):** Surprise Me about $0.0075, Weekend Plan about $0.015, Trip Plan about $0.04, chat swap about $0.005. If the model's thinking tokens are billed on top (UNKNOWN: `thinking` is not set, and on Sonnet 5 an omitted setting runs adaptive thinking), real cost could be 2 to 5 times higher. Logging `response.usage` would settle this in a day.

**How often a typical free session triggers Claude:** a normal browse (Home, Discover, Saved, detail pages) triggers **zero** Claude calls. The only free-user trigger is Surprise Me, limited to 1 per week.

**A hole in that limit:** `POST /api/ai/surprise-me` (the "not for me" and "skip" feedback) fetches the next pick, which is another Claude call and another Google fan-out, and it has **no free-tier check and no rate limit**. A free user can chain unlimited picks.

### 1.3 How the free-tier limits are implemented

- Constants: `FREE_TIER_LIMITS` in `src/lib/config/pricing.ts` (`recommendationsPerWeek: 5`, `surpriseMePerWeek: 1`, `weekendPlannerEnabled: false`, `travelModeEnabled: false`).
- **"Limit on viewing places" is really one clamp.** `src/app/api/ai/recommendations/route.ts` does `Math.min(limit, 5)` for non-premium users. Despite the name, it is a per-request cap on the personalized picks, not weekly. Enforced **server-side** (the Discover grid just shows a banner). Home shows the same rails to everyone. The public catalog (`/api/experiences`) has no per-user limit at all.
- Surprise Me: server-side, counts `surprise_me_requested` rows in `user_events` over 7 days (reads the last 200 events). Only the GET path is checked.
- Weekend and Trip planners: server-side 402 unless premium. Travel Mode: a UI lock on the travel pages.
- Single gate function: `isPremium()` in `src/lib/repositories/subscriptions.ts` (plan is premium and status is active or trialing).
- **Not enforced anywhere:** per-user daily caps on AI or Google calls. The rate limiter is in-memory per serverless instance (a soft cap).

### 1.4 Schema, auth, Stripe

**Schema** (`src/db/schema.sql`; RLS enabled on every table): `profiles` (interests, personality and preferences JSON, lat/lng, city), `experiences`, `experience_categories`, `reviews`, `saved_experiences`, `user_events`, `recommendations` (legacy, FK to `experiences`), `itineraries` and `itinerary_items`, `destinations`, `trips`, `subscriptions`, `payments`, `social_profiles`, `follows`, `shares`, `admin_users`, `job_applications`. A trigger creates `profiles`, `subscriptions` and `social_profiles` rows for every new user.

**Privacy problem that exists today, before any new feature.** The schema already has a follower model that contradicts your rules:
- `social_profiles` has `follower_count`, `following_count`, a unique public `handle`, and **`is_public` defaults to true**. The policy `"public social profiles"` allows anyone, including anonymous requests through Supabase's public key, to read every public row. The signup trigger creates one for every user with `handle = 'user_' + 8 chars of the id` and their first name as `display_name`.
- `follows` has a policy `"read follows"` with `using (true)`: the whole follow graph is world-readable.
- No code in `src/` references any of these three tables (grep found nothing), so removing them is safe for the app. **UNKNOWN whether production matches the schema file:** check in the Supabase dashboard. If it does, every user's first name and generated handle is currently readable by anyone with the project's public API key. I would fix this first.

**Auth.** Supabase Auth. Web: email and password with email confirmation, and Google OAuth. Mobile (per `zolo-app/CLAUDE.md`): email, Google, Apple, and Bearer-token calls to the same API routes. No username concept exists (only `first_name`). Sessions refresh in `src/proxy.ts`.

**Payments.** Stripe Checkout (monthly $19.99, annual $190), webhook writes `subscriptions` (`plan_id`, `status`). Digistore24 is a second rail (its IPN webhook writes the same table; its connection is listed as unconfirmed in `CLAUDE.md`). Native in-app purchase on mobile is **not built** (paywall is a stub; a sync endpoint into `subscriptions` is planned).

### 1.5 Cost per free user and per premium user

**Key point: with this architecture most Google cost does not scale per user, it scales per area per hour.** A list is cached for an hour per ~1 km area bucket (changed 2026-10-12), so the first visitor in each warm bucket pays $0.224 and the rest ride along. For a campus, that is a roughly fixed monthly bill whether you have 100 or 1,000 users.

Assumptions (all **estimate**, UNKNOWN until you give me real numbers): 3 to 6 area buckets around campus and downtown; traffic in about 14 hours a day; 5,000 free Nearby Search calls per month; a free student does 8 sessions a month; per session about 3 detail views that were not already warm and about 5 newly billed photos.

| Item | Math | Monthly |
|---|---|---|
| Fixed Google cost per warm campus area | 3 to 6 buckets x 14 h x 30 days x 7 calls = 8,820 to 17,640 calls, minus 5,000 free, x $0.032 | **about $120 to $400** |
| Marginal Google cost per free user | 8 sessions x (3 x $0.025 + 5 x $0.007) | **about $0.9** (range $0.3 to $2) |
| Marginal Claude cost per free user | 4 to 12 Surprise Me calls x $0.0075 | **about $0.03 to $0.09** |
| Marginal Google cost per premium user | heavier use, planners also list candidates | about $1.5 to $3 |
| Marginal Claude cost per premium user | 4 weekend x $0.015 + 1 trip x $0.04 + 6 chat x $0.005 + 20 Surprise Me x $0.0075 | **about $0.28** (before any thinking-token overhead) |

**Revenue side (price page figures, fees from earlier in this session: verify before relying on them).** A $4 student plan nets about $3.58 through Stripe (2.9% plus $0.30), about $3.40 through Apple or Google in-app purchase at the 15% small-business rate, and only about $2.68 through Digistore24 (about 7.9% plus $1). **Do not route the student plan through Digistore24.** At about $3.40 net, covering a $120 to $400 fixed area bill takes **about 35 to 115 paying students** before marginal costs. Your conversion rate is UNKNOWN, so I will not guess how many users that needs.

**Why the plan matters:** the fixed area cost is what a student plan can't afford. The recommended data design in 2.A2 removes it.

---

## 2. Plan

Build order and effort are in section 5. All new tables have RLS **on with no default access**; every policy is written out. Brand rules apply to all copy: minimal, no exclamation points, no emojis. Anything about location or visibility defaults to the most private setting.

### Phase 0: do first (privacy, metering, safety nets)

1. **Neutralize the public social tables.** Migration: drop `social_profiles`, `follows`, `shares`, and the `social_profiles` insert in `handle_new_user()`. Replaced by the friendship model in section B. Files: new migration, `src/db/schema.sql`.
2. **Metering.** New table `api_usage_daily` (user_id, day, claude_calls, claude_cost_usd, google_calls, google_cost_usd, primary key (user_id, day)), written by a `security definer` function `record_usage(kind, units, cost)` so users cannot edit it. RLS: owner may select own rows; no insert or update policy. Log `response.usage` in `src/ai/client.ts` and wrap Google fetches in the provider. This also gives you the "cost per free user" numbers for real.
3. **Daily hard limits** (A5 below) and the Surprise Me POST fix. Same helper.
4. The pending Google key rotation and billing payment (yours).

### A. Free tier changes

**A1. Remove the view limit.** Delete the `Math.min(limit, 5)` clamp in `/api/ai/recommendations/route.ts`; remove `recommendationsPerWeek` from `FREE_TIER_LIMITS`; update copy in `pricing.ts`, `discover-grid.tsx`, `/pricing`, FAQ, the three `/vs` pages, `pricing-faq.ts`, and any SEO test that pins these strings. Mobile: same API, so only copy changes. Risk: this makes the Google data cost the whole story, so A1 should ship **with** A2 or at least with Phase 0 limits.

**A2. Cheap browsing from our own database.** *This needs your decision.* Google's terms rule out storing its places (section 1.1), so three real options:

| Option | Browsing cost | Data quality | Effort | Notes |
|---|---|---|---|---|
| **(a) Own campus catalog from open data (recommended)** | about $0 | medium; needs a curation pass | 1 to 2 weeks | Seed from [Overture Maps Places](https://docs.overturemaps.org/) (listed as CDLA Permissive 2.0) and OpenStreetMap (ODbL, attribution required), add our own editorial fields. Confirm both licenses before launch (this is not legal advice). Google is used only **on tap** for ratings, hours and photos of one place |
| (b) Keep live Google, cut the fan-out and cache more | $120 to $400 per month per campus, less with a smaller fan-out | high | days | Keeps the existing caching in a gray area; scales with areas, not users |
| (c) License a data provider whose terms allow storage | depends on price (UNKNOWN) | high | days to weeks | I'd need quotes (Foursquare, Mapbox and similar) |

Under (a): new table `campus_places` (id, campus_id, name, category (our taxonomy), tags text[], lat, lng, address, website, source ('overture'|'osm'|'manual'), source_id, google_place_id (nullable, allowed to store), editorial_blurb, hidden_gem bool, price_level, photo_path (our own uploads or null), editorial_rank int, active bool). RLS: public select where active (it is our own catalog); writes admin only. Files: new `src/services/providers/campus-catalog-provider.ts` (implements `ExperienceProvider`, queried by distance with a Postgres index), registered ahead of Google in `providers/index.ts`; seed script `scripts/seed-campus.ts <slug>`; admin editor by extending the existing admin experiences page. Google remains the fallback for users outside any campus, with Phase 0 daily limits applied. Photos: no Google photo in lists (use category tiles like the new landing page); one Google photo on the detail screen only.

**A3. Weekly AI allowance for free users.** Free keeps a few Surprise Me picks per week (number is a config value; proposal: 3). Fix the metering so every new pick counts, GET and POST. Move the reasoning call to the cheap model (A6) so the allowance costs fractions of a cent.

**A4. Caching AI plans.** Two parts.
- *Pre-built plans (free):* new table `curated_plans` (id, campus_id, slug, title, audience, items jsonb referencing `campus_places` ids, model, prompt_version, generated_at). A script generates ~10 canonical plans per campus per week ("Cheap Saturday", "Rainy day", "Date night under $30", "Group of four"). RLS: public select. Cost: pennies per campus per week.
- *Personalized plans (Premium):* new table `ai_plan_cache` (key text primary key = hash of normalized request, area bucket, candidate-set fingerprint, model, prompt version; plan jsonb; created_at; expires_at). Normalization: sorted interests, bucketed area, day-of-week, budget bucket. TTL 7 days. RLS: service role only (no user policies). The cache stores the plan skeleton, not anything about the requesting user. Touches `src/ai/weekend-plan.ts`, `trip-plan.ts`, and their routes.

**A5. Per-user daily hard limits.** One helper `assertWithinDailyLimit(userId, kind)` reading `api_usage_daily`, called in every AI route and in the Google provider path. Proposed defaults (all config, to tune with real data): free: 10 Claude calls and 40 live Google calls per day; Premium: 60 and 200. Plus a global circuit breaker `AI_DAILY_BUDGET_USD` and `GOOGLE_DAILY_BUDGET_USD`: when the sum from the table passes it, features degrade to the deterministic fallbacks (they already exist) instead of erroring. Needs a database counter, not the in-memory limiter, so it holds across serverless instances.

**A6. Cheaper model for routine work.** Add a `tier: "fast" | "strong"` option to `callStructuredTool`: fast = `claude-haiku-5-5` ($0.10 / $0.50 per million, about 19 times cheaper than Sonnet 5) for recommendation reasoning and the two chat calls; strong = Sonnet for full itineraries. Things the docs flag that I would handle: (1) Sonnet 5.5, Opus 5.5 and Fable 5.1 **reject forced `tool_choice`**, which this code uses, so any move off Sonnet 5 requires switching to structured outputs; (2) Haiku 5.5 defaults to medium effort with adaptive thinking, so set effort low; (3) forced tool use on Haiku 5.5 is not documented either way, so test it first. I would back this with a small eval (the `ai-fallback` tests are a starting point) before switching.

### B. Light social features (discovery first)

**Guardrails, enforced in the data model:** no endpoint lists or browses users; username lookup is exact-match only and rate-limited; no counts of any kind are ever exposed; a friend list is visible only to its owner; no free-form posts; the only text input is a username and an optional 140-character note on a shared place.

**New tables** (all with RLS on; helper functions are `security definer`, `stable`, and take `auth.uid()` as input only):

| Table | Columns (summary) | RLS |
|---|---|---|
| `profiles` (add columns) | `username` (unique, 3 to 20 chars, lowercase), `campus_id`, `edu_verified_until` | existing own-profile policy; username readable only through `find_user_by_username(text)` |
| `privacy_settings` | `user_id` pk, `share_saves_with_friends` default **false**, `share_visits_with_friends` default **false**, `tonight_status_enabled` default **false**, `findable_by_username` default **false** | owner only |
| `friendships` | `user_a`, `user_b` (stored in sorted order), `status` (pending/accepted), `requested_by`, timestamps; unique pair | select and delete if you are `user_a` or `user_b`; insert only as `requested_by = auth.uid()` with status pending; update (accept) only by the other person |
| `friend_invites` | `token_hash`, `created_by`, `expires_at`, `max_uses`, `uses` | creator only; redeemed via an RPC |
| `blocks` | `blocker`, `blocked` | blocker only; a trigger deletes any friendship and hides both users from each other everywhere |
| `reports` | `reporter`, `subject_user`, `entity_type`, `entity_id`, `reason`, `status` | insert-only for users; admins read |
| `place_shares` | `from_user`, `to_user`, `entity_type` (place/plan), `entity_id`, `note` (140 chars), `read_at` | sender and recipient select; insert only if friends and not blocked. A card, not a chat thread |
| `group_plans`, `group_plan_members`, `group_plan_places`, `group_plan_votes` | plan, members (owner can only add accepted friends), places added by members, one vote per member per place | members only, via `is_group_member(plan_id)` |
| `tonight_status` | `user_id` pk, `experience_id`, `created_at`, `expires_at` (default +4 hours) | owner write; friends select only while `expires_at > now()`, both users opted in, and not blocked. No coordinates stored |

**Friend signals** ("3 friends saved this", "Maya went here"): one RPC `friend_signals(place_ids text[])` that reads `saved_experiences` under a definer, but only counts or names friends who turned on sharing **and** only for a viewer who also turned it on (reciprocity). `saved_experiences` itself stays owner-only. Because sharing defaults to off, signals are empty at launch; onboarding will offer an explicit, unchecked opt-in with a plain explanation. Realistic note: that makes the first weeks quiet, which is why section C (campus popularity) ships first.

**Sharing and groups.** Native share sheet shares a link (`https://discoverzolo.com/p/<place>` or an unguessable plan link; the existing `itineraries.share_slug` works for plans, I'd add a `share_scope` of private, friends or link). In-app "send to a friend" uses `place_shares`. Group voting uses Supabase Realtime on the group tables (RLS applies); the winner converts into a normal itinerary for all members.

**Delete my social data.** RPC `delete_my_social_data()` removes friendships, invites, blocks I created, shares, group memberships (owned groups are deleted after a confirmation), tonight status and settings. All also cascade on account deletion.

**Safety.** Block and report on every friend and group surface; an admin queue added to `/admin`; username filter. This is also what App Store review expects for apps with user-generated content.

Files (web): `src/lib/repositories/{friends,groups,tonight,privacy}.ts`; API routes under `src/app/api/{friends,groups,tonight,signals,privacy,blocks,reports}`; a friend-signal chip on `experience-card.tsx`; a Privacy and Friends settings page; group plan page; share sheet component.

Mobile-specific: native share sheet (`Share.share`), Universal Links for invite and shared-place links (needs the `apple-app-site-association` file hosted on discoverzolo.com plus a signed native build, as already noted in `zolo-app/CLAUDE.md`), push notifications for friend requests and group invites (a `push_tokens` table, owner-only RLS, **off by default**), and Sign in with Apple stays required while Google sign-in exists.

### C. Campus-first features

- **`campuses` table:** id, slug, name, `email_domains text[]`, center lat/lng, radius_km, timezone, `config jsonb` (display price, launch date, copy overrides), active. The pilot school is one row; I need the exact email domain(s) and center point from you (section 7). Adding a campus is an insert plus `scripts/seed-campus.ts <slug>`, not code.
- **Verified .edu signup.** Two paths: (1) sign up with a `.edu` address, and the existing email confirmation plus a domain match against `campuses.email_domains` sets `campus_id` and `edu_verified_until` (extend `handle_new_user` and an update trigger); (2) users who signed in with Google or Apple verify a student address from settings through a small `edu_verifications` table (token hash, expiry) and our existing email sender (Resend). A unique hash of the verified address prevents one address verifying many accounts, and only the hash, campus and expiry are kept. Verification lasts one academic year (graduates keep working addresses, so expiry matters). 
- **"Popular at your campus."** A nightly job writes `campus_place_stats` (campus_id, place id, distinct_users_14d). **A place appears only when at least 5 distinct students saved or completed it**, so no individual can be inferred. RLS: readable only by verified members of that campus. Cold start before enough activity: `campus_places.editorial_rank` (our staff picks) fills the view. New rail on Home and a "Popular at your campus" sort on Discover.
- Mobile: a verification step in onboarding. Apple's hidden-email relay addresses cannot be verified directly, which is why path (2) exists.

### D. Revenue support

- **Student plan.** A new Stripe price (monthly, optionally annual), shown from a configurable env value in `pricing.ts` (target $3 to $5). `createCheckoutSession` selects the student price **only if** `edu_verified_until > now()`, checked on the server. Same entitlements as Premium; add `subscriptions.price_tier` ('standard'|'student') for reporting. Mobile needs separate in-app purchase products (Apple and Google fees apply). At renewal an expired verification needs a policy (section 7).
- **Featured and deals (plan only).** Tables: `businesses` (name, place link, contact, status), `placements` (business_id, campus_id, kind featured|deal, title, 140-character body, starts_at, ends_at, price_cents, status), `deals` (placement_id, terms, redemption method, optional code, max redemptions, student_only), `placement_stats` (daily impression and click **counts**, no user ids). Rules: always labeled "Featured" or "Sponsored", shown in their own slot, never altering match scores or reasons. What it takes to build: about 1.5 to 2 weeks for admin CRUD, display and redemption. Suggested v1: manual (you invoice with Stripe payment links, no payment code). Not worth building until a few businesses say yes.

---

## 3. Web and mobile in sync

Shared logic lives in the API routes and Postgres (policies, RPCs), so both clients get the same behavior from one implementation. Mobile-only pieces: push notifications, Universal Links, native share, in-app purchases for the student plan, Apple's account-deletion and user-generated-content rules. Per `zolo-app/CLAUDE.md` the mobile app has its own repo and a separate Claude session, so I would note each shared change there and message that session when one lands.

## 4. Risks

- **Google terms.** Any plan that keeps displaying Google data from our database risks losing the key; the plan avoids it by design.
- **Open-data quality.** Overture and OSM listings have sparse hours and noisy categories; you need a curation pass for the campus area. This is the main time cost of A2.
- **Cold start of friend features.** Empty at launch because sharing defaults to off; campus popularity and editorial picks cover it.
- **Moderation and App Store review.** Friends, groups and notes need report and block, a moderation queue, and a quick response time from you.
- **Verification gaps.** Graduates keep addresses; some students use non-`.edu` addresses.
- **Student price.** Cannibalizes the standard price if verification is weak; payment-fee drag at low prices (Digistore24 especially).
- **Copy and legal.** The landing page, pricing, FAQ, `/vs` pages and the SEO audit tests all target "young professionals"; the privacy policy and terms need updates for friends, location, `.edu` data and Anthropic.
- **Scope.** This is realistically two to three months of solo work; Phase 0 to 2 delivers the cost fix and the campus value first.

## 5. Build order (rough effort, solo developer)

| Phase | Contents | Effort |
|---|---|---|
| 0 | Drop public social tables, metering, daily limits, Surprise Me fix (and your Google key rotation and payment) | 2 to 3 days |
| 1 | A1 remove limit, A3 allowance, A6 model tiering, A4 pre-built plans | about 1 week |
| 2 | C campuses and .edu verification, A2 campus catalog and seed, "Popular at campus" | 2 to 3 weeks |
| 3 | B friends, privacy settings, signals, share; then groups and voting; **"tonight" status last** (highest privacy risk) | 3 to 4 weeks |
| 4 | D student plan and pricing, mobile in-app purchase and parity | about 1 week web, mobile separate |
| 5 | Businesses, placements, deals (manual v1) | after traction |

## 6. Migrations

One migration per phase, additive, in `src/db/` (the repo keeps a single `schema.sql` plus a `scripts/migrate.ts` runner, so I would add dated migration files and update the schema file). Phase 0 includes the one destructive step (dropping the three social tables), which I would run only after you confirm they are unused in production.

## 7. What I need from you (I did not guess these)

1. **Google billing, last 30 days, grouped by SKU** (Billing, Reports), and request counts per API. This calibrates every Google number above.
2. **Anthropic Console usage and cost for the last 30 days**, and the production value of `ANTHROPIC_MODEL` (hidden in Vercel).
3. **Supabase row counts:** `profiles`, `social_profiles`, `follows`, `user_events` (last 30 days by type), `saved_experiences`, and your Vercel and Supabase plans.
4. **Current users:** total accounts, monthly actives, number of Premium subscribers.
5. **Pilot school:** exact student email domain(s), the campus center point and the radius you want covered, expected pilot size and launch date.
6. **Student price** target ($3, $4 or $5), annual option or not, and what happens to the price when a student's verification expires.
7. **Data source for A2:** (a) open-data campus catalog, (b) keep live Google, or (c) get quotes from a licensed provider.
8. **iOS and Android timing**, and whether you have an Apple Developer account for in-app purchases.
9. **Open to everyone or campus-only?** If non-campus users stay, the Google fallback and its limits stay too.
10. **Minimum age** and who handles reports and moderation (you?).
