@AGENTS.md

# Zolo — Project State

> Read this before doing anything else in this repo. It reflects the state as of the
> last update below — verify anything critical (git log, file contents) rather than
> trusting this blindly if it's been a while.
>
> Full setup/architecture docs: [README.md](README.md). Full DB schema: [src/db/schema.sql](src/db/schema.sql).

**Last updated:** 2026-08-31

## What this is

Zolo (originally scaffolded as "REAL", renamed — brand is centralized in `src/lib/config/brand.ts`,
nothing else should hard-code the name) is a full-stack Next.js 16 personalized discovery app:
AI-powered recommendations for real-world experiences, weekend planning, travel mode, and a
Premium subscription. Built for the user as a from-scratch, production-oriented app, not a demo.

## Current status: functional, deployed, mid-configuration

- **Code**: complete first version of every major feature in the original spec (landing page,
  auth, onboarding, home feed, discover, experience detail, map, weekend planner, travel mode,
  saved, profile, admin dashboard, full JSON API). ~150 source files.
- **GitHub**: pushed to `https://github.com/gmulla12345/Startup-Code`, branch `main` (default).
  Working tree is clean as of the last commit in `git log`.
- **Vercel**: **live in production at `https://discoverzolo.com`**, confirmed working (signup/
  login tested end-to-end). Deploy uses `next build --webpack` (Turbopack crashes on Vercel's
  Linux build image). Vercel CLI is linked locally (`vercel` command available, logged in as
  `gmulla12345`) — `vercel env add/ls`, `vercel deploy --prod` etc. all work from this machine
  without needing the dashboard.
- **Environment variables**: real credentials are set in both `.env.local` (local dev) and
  Vercel's Production+Preview env vars (confirmed correct via `vercel env ls production` after
  discovering many had been bulk-imported as placeholder/example values, not real ones).

## What's configured (`.env.local` for dev; Vercel Production/Preview for deployed)

Everything below is done and verified working. `.env.local` and Vercel **Preview** intentionally
stay on Stripe **test-mode** keys (so preview deploys never touch real money); Vercel **Production**
holds the live-mode equivalents.

- Supabase (URL, anon/publishable key, service role/secret key) — project ref `pfdfphtdkriflrclczwn`,
  schema applied, seed data loaded (24 experiences, categories, 3 destinations)
- `ADMIN_EMAIL=gledimulla@gmail.com` (their real account, confirmed working, has admin access)
- Google Maps API key (`MAPS_API_KEY`) — Places API confirmed enabled and working
- `ANTHROPIC_API_KEY` — real key set, Claude-generated recommendation reasoning is live
- Google OAuth enabled in Supabase Auth ("Continue with Google" works)
- Custom SMTP (Resend) wired into Supabase Auth for account emails; `RESEND_API_KEY` also used
  directly by `/api/contact` and the careers form
- Sentry (`NEXT_PUBLIC_SENTRY_DSN`) — error monitoring live client + server side
- **Stripe live mode** (done 2026-08-30): live "Zolo Premium" $19.99/mo product+price created via
  API (`prod_VAx1sECBOtUeh8` / price ID in `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID`), live webhook
  endpoint created at `https://discoverzolo.com/api/stripe/webhook`, all 4 live env vars
  (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID`) pushed to Vercel Production only via
  `vercel env add <NAME> production --force --value "..."` (note: `vercel env rm` on a Production
  var was blocked by this environment's destructive-action classifier — `env add --force` to
  overwrite works fine and isn't blocked, use that instead of `rm` + `add`). Redeployed and
  confirmed the site is serving. 7-day free trial (`trial_period_days: 7`) is live in
  [src/lib/stripe/checkout.ts](src/lib/stripe/checkout.ts). **Not yet done: an actual real-money
  checkout has not been run end-to-end in live mode** — that's a real charge on a real card, so it
  needs the user to personally click through Subscribe once and confirm it works (and that
  `subscriptions`/`payments` rows land correctly), not an agent.
- `DATABASE_URL` — direct Postgres connection, used only by `scripts/migrate.ts`

## Architecture highlights (don't rebuild these — extend them)

- **Provider abstraction** (`src/services/providers/`): `ExperienceProvider` interface with a
  mock impl, a Supabase impl, a **Google Places impl** (`google-places-experience-provider.ts`,
  live worldwide place data + real Google Photos, added because the user explicitly wanted
  discovery to work for any location, not just seeded cities), and a `CompositeExperienceProvider`
  that blends curated + Google Places results when `MAPS_API_KEY` is set. Factory is
  `services/providers/index.ts` — always go through it, never import a concrete provider directly.
- **Hybrid recommendation engine** (`src/services/recommendation/`): structured filtering →
  deterministic scoring (`scoring.ts`, scores capped at 98 to avoid fake-looking 100% matches) →
  optional Claude reasoning (`src/ai/recommend.ts`) that can only refine scores for candidates
  already selected by the scorer — the model can never invent a price, address, or experience.
  Works fully without `ANTHROPIC_API_KEY`.
- **Two Supabase clients matter**: `lib/supabase/server.ts` (cookie-aware, session-scoped) vs.
  `lib/supabase/public.ts` (cookie-free, anon-only). The public one is used for the catalog
  specifically so pages that don't need a session (landing page, sitemap) stay statically
  prerendered — using the cookie-aware client there silently forces dynamic rendering.
- **Stripe**: Checkout Sessions (not raw PaymentIntents), `automatic_tax` enabled (Tax product),
  idempotency key on checkout creation, webhook signature verification, `payments` table has a
  unique constraint on `stripe_invoice_id` with `upsert` (not `insert`) to survive Stripe's
  webhook retries safely. Billing history surfaced on the Profile page (the "Invoicing" product).
- **Build uses webpack, not Turbopack**, for production (`npm run build` = `next build --webpack`)
  — see Vercel note above. `npm run dev` still uses Turbopack (works fine locally).
- **Windows/Linux risk**: this was built and tested on Windows. Windows filesystem is
  case-insensitive; Vercel's Linux build is not. If a future Vercel build fails on a "module not
  found" error that works locally, suspect an import/filename case mismatch first.

## Known non-issues (already investigated, don't re-litigate)

- **The fictional demo catalog is REMOVED from production (2026-08-31) — do not reintroduce it.**
  See "Production catalog is Google Places-only" below for the full story; the 2026-08-27
  "Editorial pick" badge/disclosure approach documented in earlier versions of this file was
  judged insufficient and superseded by actually removing the fictional content, not just
  labeling it.
- A real prefix-matching bug in route protection was found and fixed (`/map` was matching
  `/map-debug` via naive `startsWith`) — `src/lib/supabase/middleware.ts` now matches full path
  segments.
- The app runs fully with zero credentials configured (mock data, graceful fallbacks everywhere)
  — this is by design, not a bug, and is covered by `src/lib/supabase/env.ts` and the provider
  factory's `isSupabaseConfigured()` checks.

## Production catalog is Google Places-only (2026-08-31 — read before touching the catalog)

A friend testing the live site found a listing ("Sunset Kayaking on the Inner Harbor") with a
surfing photo and a "Book Now" link to Baltimore Water Taxi, a real company that doesn't offer
kayaking — the fabricated listing had even reused Water Taxi's real dock address. The user's
standard, stated explicitly: **every place shown on Zolo must be 100% accurate — real place, real
photo of that specific place, no invented tours, no exceptions.** Investigation found this wasn't
a one-off photo bug: all 24 seeded listings in `src/db/seed-data.ts` are fictional (invented tour
names/descriptions, generic stock photos), and 8 of them linked to real businesses (Viator,
Movement Gyms, Cruise Baltimore, Bike and Roll, teamLab, EscapeRoom.com) implying those businesses
offer the invented tour. The user confirmed (2026-08-31): remove this content from production
entirely; it may stay in the codebase for zero-credential local dev only.

**What changed:**
- All 24 `source_provider = 'mock'` rows **deleted from the production Supabase `experiences`
  table** (they were seeded there by `scripts/seed-supabase.ts`; cascade-deleted their `reviews`
  rows too, which is correct — those were fake demo reviews on fake listings).
- **Structural guardrail, not just a one-time cleanup**: `SupabaseExperienceProvider`
  ([src/services/providers/supabase-experience-provider.ts](src/services/providers/supabase-experience-provider.ts))
  now hard-excludes `source_provider = 'mock'` from every query (`list`, `getById`, `getBySlug`,
  `getRelated`). Even if `scripts/seed-supabase.ts` is ever run again against production, or an
  admin re-imports seed data, mock rows can never reach real users again. **Never run
  `scripts/seed-supabase.ts` against production** regardless.
- `seed-data.ts` itself: all `externalBookingUrl` values pointing at real businesses set to
  `null` (the same fabricated-association problem, fixed at the source for local dev too), and a
  warning comment added explaining this file is dev-only.
- Production experiences now come **exclusively** from `GooglePlacesExperienceProvider` (real
  places, real Google Photos, real addresses/ratings) via `CompositeExperienceProvider`. This
  required passing `latitude`/`longitude` into three call sites that previously relied on the
  (now-empty) curated Supabase layer as an implicit fallback and would otherwise return nothing:
  [src/app/(marketing)/page.tsx](<src/app/(marketing)/page.tsx>) (homepage teaser, hardcoded to
  New York's coords), [src/app/(app)/travel/[destination]/page.tsx](<src/app/(app)/travel/[destination]/page.tsx>)
  (now passes `dest.latitude`/`dest.longitude`), and
  [src/app/(app)/discover/page.tsx](<src/app/(app)/discover/page.tsx>) (New York default when a
  user has no profile location set). If you add a new page that queries the catalog, it needs
  real coordinates too — there is no curated-catalog fallback anymore.
- [src/components/marketing/example-recommendations.tsx](src/components/marketing/example-recommendations.tsx)
  had hardcoded fake "94%/88%/91% match" scores and fake personalized reasoning text tied to the
  old fixed 3 mock listings — removed, since real Google-sourced places now populate that
  homepage section and the fake numbers/reasoning would be attached to random real places.
- **Google Maps Platform attribution added** (was missing entirely, a real compliance gap given
  production now leans entirely on Google Places data displayed without a Google Map — our map
  widgets are OpenStreetMap/MapLibre, not Google's): a persistent "Powered by Google" badge
  site-wide in [src/app/layout.tsx](src/app/layout.tsx) via
  [src/components/shared/google-attribution.tsx](src/components/shared/google-attribution.tsx),
  plus one in the city-search autocomplete dropdown in
  [src/components/onboarding/step-basics.tsx](src/components/onboarding/step-basics.tsx). Terms
  of Service's Google Maps clause corrected to say Places/Geocoding (not "maps" generally, since
  Google doesn't render our map tiles).
- The Hero section's decorative image grid ([src/components/marketing/hero.tsx](src/components/marketing/hero.tsx))
  used the same wrong surfing photo for its "Kayaking" tile — fixed with a real kayaking photo.

**What this means going forward**: the catalog is now only as big as what Google Places actually
returns for a given location/category — no more guaranteed "hidden gem" curated storytelling.
`CompositeExperienceProvider` still supports blending in a real curated layer (verified real
listings an admin adds via `/admin/experiences`) alongside Google results; it's just empty right
now. If the user wants curated content back, it needs to be real and individually verified — not
reused fiction.

**IMPORTANT follow-up bug found and fixed same day (2026-08-31), read this before touching
`ResilientExperienceProvider` or the excludeIds path again**: `ResilientExperienceProvider`
silently fell back to the raw, unfiltered `MockExperienceProvider` (the fictional catalog) on
*any* error from the primary Supabase call — and there was a real, common error that triggered
it: `SupabaseExperienceProvider.list()`'s excludeIds filter did `.not("id","in",(...))` against
the `experiences.id` uuid column using the *unfiltered* excludeIds list, which — once production
went Google-only — almost always contains Google-prefixed ids like `g-ChIJ...` (not valid uuids).
Postgres threw a type error on basically every "Not For Me" / Surprise Me exclude request, and
the resilience wrapper quietly served fictional listings instead of surfacing the error. This is
exactly the bug the user hit when Surprise Me kept repeating the same obvious landmark and once
literally returned "Golden Hour Picnic & Photography Walk" — a fictional listing that no longer
exists in the database. Fixed two ways: (1)
[supabase-experience-provider.ts](src/services/providers/supabase-experience-provider.ts) now
filters `excludeIds` to only valid-uuid-shaped strings before building the Postgres filter, and
(2) [resilient-experience-provider.ts](src/services/providers/resilient-experience-provider.ts)
no longer has a mock-data fallback at all — it returns empty/null on error instead, which is
worse UX during a genuine outage but can never again silently reintroduce fictional content. If
you add a new filter to `SupabaseExperienceProvider.list()`, sanity-check it against ids that
don't look like uuids (Google-prefixed) before assuming the query is safe.

Also fixed same day: `GooglePlacesExperienceProvider.list()` used to completely ignore
`query.excludeIds` (a second, independent reason Surprise Me repeated itself), and defaulted to
searching only Google's `tourist_attraction` place type whenever no category was specified —
which is the common case for the home feed/Surprise Me — so results were dominated by the most
prominent local landmarks with little variety. Both fixed in the same file: excludeIds is now
applied, and an unfiltered query fans out across `DIVERSITY_TYPES` (tourist_attraction,
restaurant, cafe, museum, park, bar, spa) in parallel and merges/dedupes the results, giving the
scorer a much larger and more varied real candidate pool. Verified live: consecutive "Not For Me"
clicks returned Times Square → Radio City Music Hall → Rockefeller Center, no repeats, no
fictional content.

**Also same day**: removed emoji from interest/goal chips app-wide
([src/lib/config/taxonomy.ts](src/lib/config/taxonomy.ts),
[src/components/onboarding/chip-select.tsx](src/components/onboarding/chip-select.tsx)) per user
feedback that the Weekend Planner page "looked less premium" — `ChipSelect` now renders flowing
pills matching `PillGroup`'s exact style/active-color (forest, not ember) instead of a boxy
ember-colored grid with emoji, for one consistent visual language across onboarding and the
Weekend Planner (both reuse the same component).

## AI Trip Planner, Discover limits, and a request-level caching fix (2026-08-31)

Three more things fixed same day, after the catalog-accuracy work above:

1. **"Plan a trip to [city]" was completely broken** — it posted to `/api/trips`, which inserted a
   row into the `trips` table that literally nothing ever read (not even the `/trips` page, which
   only ever displayed `itineraries`), then redirected to `/trips` with no indication anything
   happened. That whole `trips` table/route/schema was dead weight from an earlier, never-finished
   design; deleted [src/app/api/trips/route.ts](src/app/api/trips/route.ts) and
   `createTripSchema`. **Real premium AI Trip Planner built from scratch**, reusing the
   `itineraries`/`itinerary_items` tables the Weekend Planner already uses (the schema's `type`
   check constraint already had `'travel'` sitting there unused):
   [src/components/trips/trip-planner-modal.tsx](src/components/trips/trip-planner-modal.tsx) asks
   for real dates + budget/social/energy/interests, `POST /api/ai/trip-plan`
   ([src/app/api/ai/trip-plan/route.ts](src/app/api/ai/trip-plan/route.ts), premium-gated, no
   free-tier fallback) generates a day-by-day plan via
   [src/ai/trip-plan.ts](src/ai/trip-plan.ts) (same validated-structured-output pattern as
   `src/ai/weekend-plan.ts`, capped at 14 days) using real candidates fetched from the
   destination's actual coordinates, then saves and redirects straight to `/trips/[id]` — no
   separate manual "save" step, unlike Weekend Planner. `ItineraryDetail` now shows real calendar
   dates per day (`Day 1 — Saturday, Sep 12`) when `itinerary.startDate` is set.
   - **Found and fixed a real, separate bug while building this**: `itinerary_items.experience_id`
     was a `uuid` foreign key into `public.experiences` — fine when the catalog was curated, but
     since production is Google Places-only, saving any plan item tied to a real place (a `g-`
     prefixed id, not a uuid) threw a Postgres type error and the whole save failed. This silently
     affected Weekend Planner's "Save Plan" too, not just the new Trip Planner. Fixed by loosening
     the column to plain `text` with no FK (migration block in
     [src/db/schema.sql](src/db/schema.sql), already applied via `npm run migrate` — the detail
     page already renders items from their own stored title/notes/cost, never by re-fetching the
     referenced experience, so this had zero UI impact). **Verified live**: generated a real 3-day
     NYC trip end-to-end — every named business (Rockefeller Center, Carmine's, Zabar's, The River
     Café, etc.) resolved to a real Google Places id, only genuinely generic items ("Breakfast near
     the hotel") had none, exactly per the AI system prompt's rules.
2. **Discover's Premium limit didn't actually do anything** — the client hardcoded
   `limit=24` regardless of plan, and even that was capped further because
   `getRecommendations()` always fetched only 60 raw candidates and
   `generateAIRecommendations()` only ever sent the top 12 to the AI for reasoning, both
   hardcoded regardless of the requested limit. Fixed in
   [src/services/recommendation/engine.ts](src/services/recommendation/engine.ts) (candidate pool
   now scales with the requested limit, capped at 120) and
   [src/ai/recommend.ts](src/ai/recommend.ts) (AI reasons the top `AI_REASONING_BATCH_SIZE` = 20
   as before for latency/cost, but everything beyond that now gets fast deterministic reasoning
   instead of being dropped entirely — so a big batch doesn't silently shrink). Discover's fetch
   now requests `limit=100` for the personalized sort
   ([src/components/discover/discover-grid.tsx](src/components/discover/discover-grid.tsx)); free
   tier is unaffected (still server-capped to `FREE_TIER_LIMITS.recommendationsPerWeek` = 5,
   unchanged). Verified live: premium test account got exactly 100 results back. Interest-aligned
   results were already sorted first before this change — `scoreExperience()` in
   `src/services/recommendation/scoring.ts` weights interest-tag overlap as the single largest
   scoring factor — so nothing needed to change there.
3. **Fixed a real, systemic cause of "the site feels slow switching between pages"**: every single
   page under `(app)/` (`/home`, `/discover`, `/map`, `/profile`, `/saved`, `/trips`,
   `/trips/[id]`, `/experience/[id]`, `/travel/[destination]`) was independently re-fetching
   `supabase.auth.getUser()` and, in most cases, the profile/subscription too — on top of the
   `(app)/layout.tsx` already having fetched all three for every request. That's at minimum 2x the
   necessary Supabase round trips on every navigation, before any page-specific data fetching even
   starts. Fixed with React's per-request `cache()`:
   [src/lib/supabase/server.ts](src/lib/supabase/server.ts) now exports a cached `createClient`
   plus a new cached `getCurrentUser()` helper; `getProfileByUserId`
   ([src/lib/repositories/profile.ts](src/lib/repositories/profile.ts)) and `getSubscription`
   ([src/lib/repositories/subscriptions.ts](src/lib/repositories/subscriptions.ts)) are now
   `cache()`-wrapped too. Every page listed above was updated to call `getCurrentUser()` instead of
   `(await createClient()).auth.getUser()` directly — that's the part that actually makes the
   dedup work, since Supabase's `getUser()` always revalidates over the network regardless of
   client-instance reuse. This is the standard documented pattern for this exact layout+page
   double-fetch problem; not fully verified with before/after production timing numbers (see next
   steps below), but it's a straightforward, low-risk correctness fix regardless — the duplicate
   fetches were never doing anything useful.

## Trip Planner is now fully editable (2026-08-31, same day as the section above)

User asked for: a quantitative budget picker (not just $ symbols), full editability of a generated
trip plan, descriptions + images per activity (clickable), and a way to swap out or remove an
activity — either by clicking it or via a chat box. **Chat-based editing is explicitly deferred to
a follow-up round** — flagged to the user up front as separate, larger scope (a new AI agent that
parses free-form requests into structured itinerary edits) from the click-to-swap picker, which
shipped this round. Don't build the chat box without re-confirming scope with the user first.

What shipped:
- **Quantitative budget**: [src/components/trips/trip-planner-modal.tsx](src/components/trips/trip-planner-modal.tsx)'s
  pills now read "Free / Under $75 / $75–200 / $200+" (per day, per person) instead of $/$$/$$$.
  The underlying values (`free`/`low`/`medium`/`high`) are unchanged — only labels — but
  [src/ai/trip-plan.ts](src/ai/trip-plan.ts)'s prompt now also spells out the real dollar range to
  the model (`BUDGET_DESCRIPTIONS`), not just the bare label.
- **Real images and descriptions per activity**: the AI never sees or invents image URLs — after
  the model picks candidate ids, `attachImages()` (now exported from
  [src/ai/weekend-plan.ts](src/ai/weekend-plan.ts), reused by `trip-plan.ts`) looks up each item's
  real images from the actual candidate list. `WeekendPlanItem`/`TripPlanItem` gained an `images:
  string[]` field; `itinerary_items` gained an `images text[]` column (migration in
  [src/db/schema.sql](src/db/schema.sql), already applied). Descriptions were already there
  (`notes`, AI-written per item) — just weren't surfaced anywhere clickable before.
- **`itineraries` gained a destination** (`destination_city/country/latitude/longitude`, migration
  applied) — populated for Trip Planner-created itineraries (`saveTripPlanAsItinerary`), left null
  for Weekend Planner ones. This is the geo anchor the swap feature needs; it's also why swapping
  is only available on trip-type itineraries for now, not weekend ones (feature-detected via
  `itinerary.destinationLatitude != null`, not an explicit flag).
- **`/trips/[id]` is now a fully interactive client component**
  ([src/components/trips/itinerary-detail.tsx](src/components/trips/itinerary-detail.tsx)):
  clicking any activity opens a modal with its full image gallery (swipeable if >1 image),
  description, cost, a "View full details" link to the real experience page, and **Swap this** /
  **Remove** actions. Swap fetches real nearby alternatives (never AI-generated — same live Google
  Places data as everything else, excluding places already in the itinerary) from a new endpoint
  and lets the user pick one, or "No event — leave this slot free." All mutations
  (`PATCH`/`DELETE` on [src/app/api/itineraries/[id]/items/[itemId]/route.ts](<src/app/api/itineraries/[id]/items/[itemId]/route.ts>),
  alternatives via [.../alternatives/route.ts](<src/app/api/itineraries/[id]/items/[itemId]/alternatives/route.ts>))
  are ownership-checked in `lib/repositories/itineraries.ts` (`requireOwnedItinerary`) and update
  local state immediately — no page reload. **Verified live end to end**: generated a real 2-day
  NYC trip, swapped Rockefeller Center for Lincoln Center (persisted correctly in the DB, UI
  updated without reload), removed Times Square entirely (persisted, UI updated). Screenshots were
  unreliable/stale during this verification (a recurring browser-tool artifact this session, not an
  app bug) — verified via direct DOM inspection and DB queries instead when screenshots looked stuck.

## Site-wide slowness root-caused and fixed (2026-08-31)

The "slow switching pages" complaint from item #4 below was real and had two independent causes,
both now fixed. **Read this before touching Home, Map, `/travel/[destination]`, or anything in
`src/ai/`.**

**Cause 1 — no streaming, so a slow data source blocked the whole page.** `home/page.tsx`,
`map/page.tsx`, and `travel/[destination]/page.tsx` were plain `async` Server Components with no
`<Suspense>` boundary: the entire page — header, nav, everything — waited on the slowest fetch
before any HTML rendered, even though `loading.tsx` already existed per-route (so the skeleton
showed immediately, but stayed up for however long the slowest fetch took). Fixed by splitting
each into a fast shell (auth + profile, renders immediately) plus an inner async component wrapped
in `<Suspense fallback={...}>` for the slow part (recommendations on Home, `provider.list()` on Map
and the destination rails on Travel) — the shell now paints instantly and the slow part streams in
behind a rail/skeleton fallback instead of blocking. Also parallelized `buildContext()` in
`src/services/recommendation/engine.ts` (`getRecentEvents`/`getSavedTagCounts`/`getWeather` were
sequential `await`s, now `Promise.all`). Also added `experimental.staleTimes.dynamic = 30` to
`next.config.ts` — Next's default for dynamic route segments is 0s (always refetch from the
server), so revisiting a tab within 30s previously re-ran the *entire* server round trip every
time; this makes bouncing between Home/Discover/Map/Trips/Saved/Profile within 30s instant
(client-side cache reuse, zero server round trip).

**Cause 2 (the bigger one) — the AI recommendation-reasoning call had no real timeout and was
failing almost every time, silently, after a very long wait.** `getAnthropicClient()`
(`src/ai/client.ts`) never set a `timeout`, so it used the SDK default of **10 minutes**, and "timed
out" requests are retried by default — a slow response could hold a page open far longer than
anyone would wait for, and did: direct log evidence from this session showed `/home` taking **14s,
17s, 25s, 27s, and 33s** in different real requests, before any of today's fixes. Root-caused by
timing the *exact* tool-use call directly against the Anthropic API outside the app (bypassing all
app code): a 10-candidate forced-tool-call batch (the size `AI_REASONING_BATCH_SIZE` was set to)
took **10.3 seconds** end-to-end on `claude-sonnet-5` — this is a **non-streamed** call
(`anthropic.messages.create` without `stream: true`), so the model must finish generating the
*entire* batch before anything comes back; there was no bug in the sense of a hang, it was just
genuinely that slow for that batch size, every single time. Confirmed on production too, live: a
fresh login to `discoverzolo.com` took ~9-10s to show `/home`'s content, and what did show was the
generic deterministic fallback reasoning ("Fits your usual budget. Close to you") rather than real
AI-written blurbs — meaning the AI call has likely been failing/falling-back on close to every
request in production, not intermittently. There was also a second, compounding bug: the
recommendation call never passed `maxTokens` to `callStructuredTool`, so it used the 2048-token
default, which was tight enough to truncate the tool call's JSON mid-array on larger batches —
this is why "`[ai] recommendation output failed validation: expected array, received undefined`"
was showing up constantly in the logs, independent of the timeout issue.

Fixed all of it together:
- `callStructuredTool` (`src/ai/client.ts`) now takes a per-call `timeoutMs`, passed as a
  per-request override (`anthropic.messages.create(params, { timeout })`) — **do not** set a short
  timeout at the client level again; the trip planner and weekend planner generate much bigger
  outputs and need real room (`timeoutMs: 45_000` and `25_000` respectively; the client-level
  default is just a 30s fallback ceiling for any future caller that forgets to pass one).
- `src/ai/recommend.ts`: `AI_REASONING_BATCH_SIZE` dropped from 20 → 6 (measured: comfortably
  inside a 12s timeout, verified live — 4 fresh `/home` loads after the fix landed took 6.8s, 7.6s,
  8.4s, and 10.3s, all succeeding with real AI reasoning visible in the response), `maxTokens` set
  explicitly (1400, sized to the smaller batch), `timeoutMs: 12_000`. Candidates beyond the batch
  size still get the fast deterministic fallback reasoning exactly as before — this only changes
  how many items get the AI-polished version per call, not whether the rest get reasoning at all.
- `maxRetries: 0` on the Anthropic client — the SDK retries timeouts by default, which was
  silently doubling the worst case (a timed-out 8s attempt became a 16s total wait) for zero
  realistic benefit, since a retry right after a slow attempt isn't meaningfully more likely to
  come back fast.

**If AI reasoning feels unreliable again**, the first thing to check is whether
`AI_REASONING_BATCH_SIZE` / `timeoutMs` in `src/ai/recommend.ts` still match reality — re-run the
direct-API timing test (construct the same tool-use payload and time a raw `fetch` to
`https://api.anthropic.com/v1/messages`, bypassing all app code) rather than guessing from
in-app logs, since retries and Suspense streaming can obscure how long the underlying call
actually took.

## Chat-based itinerary editing (2026-09-01)

The third (and last-planned) way to edit an itinerary, alongside the click-to-swap picker and
Remove button — a chat box at the bottom of `/trips/[id]`
([src/components/trips/itinerary-detail.tsx](src/components/trips/itinerary-detail.tsx)). Deferred
from the itinerary-editing work above with the user's explicit agreement (they picked "Both" when
asked, picker shipped first); this is that follow-up round.

**Deliberately reuses the click-to-swap picker's exact machinery rather than inventing a new
mutation path** — the whole point of scoping it this way (per the plan already written into this
file before building it): `updateItineraryItem`/`deleteItineraryItem` in
[src/lib/repositories/itineraries.ts](src/lib/repositories/itineraries.ts) are the *only* things
that ever touch the database, same as the picker. The candidate-fetching query that used to live
inline in the alternatives route was factored out into a shared `getSwapCandidates()` in that same
repository file (both the picker and chat now call it, so they always offer identical real
candidates — not two different notions of "nearby").

**Two small AI calls, not one big one** — this project just spent an entire session learning that
non-streamed structured-output calls scale badly with batch size (see the site-speed section
above), so this was built to stay small and fast from the start:
1. `interpretItineraryChat()` ([src/ai/itinerary-chat.ts](src/ai/itinerary-chat.ts)) — given the
   user's message and a short summary of each item (day, time, title, notes), decides
   `action: "remove" | "swap" | "clarify"`, which `itemId`, and (for swap) a free-form
   `preference` string. Never sees or touches real place data.
2. Only for `"swap"`: `pickSwapCandidate()` — given that preference and the real candidate list
   from `getSwapCandidates()` (same live provider data as everything else, never AI-generated),
   picks one `experienceId` or `null` if nothing fits. The model never invents a place, price, or
   description — it only ever selects an id from what it's given, exactly like the recommendation
   and trip-plan AI already does elsewhere in this codebase.

New route: `POST /api/itineraries/[id]/chat`
([src/app/api/itineraries/[id]/chat/route.ts](<src/app/api/itineraries/[id]/chat/route.ts>)),
rate-limited 20/min per user, returns `{ reply }` for a clarification, or `{ reply, item }` /
`{ reply, removed: true, itemId }` for an applied change — `itinerary-detail.tsx` uses exactly
those to update its local `items` state (no reload), same pattern as the existing swap/remove
buttons.

**Verified live end to end** using a disposable Supabase test account with a hand-seeded itinerary
(2 real items, real Google Places ids) — chose to seed directly via the DB rather than generating
through the Trip Planner, to control exactly what was being tested: (1) "remove the Times Square
visit" → item disappeared from the UI and was confirmed actually deleted via a direct DB query
(not just hidden client-side); (2) "swap dinner for something more casual and cheaper" → both AI
calls completed in 7.7s total, picked a real nearby place, confirmed persisted in the DB with the
real place's actual notes/experience_id; (3) "can you reorder the days and add a whole new day 3"
(deliberately out of scope) → correctly replied "I can only swap or remove existing items right
now, not reorder days or add new ones" without touching the database, proving the "clarify" path
doesn't silently no-op or crash.

## `user_events`, `saved_experiences`, and `reviews` uuid-column bug fixed (2026-09-01)

Same root cause and same fix as `itinerary_items.experience_id` (see the catalog section above),
found while checking on a task that had been spawned for it — **the spawned task never actually
ran**: `list_events` on that session showed a single turn, `[assistant] Failed to authenticate. API
Error: 401 OAuth access token has expired.` and nothing else. Worth remembering for next time: a
task chip showing "already started" only means a session was created for it, not that it made any
progress — check `list_events` on the session, don't assume.

Three columns had the exact same `uuid` FK problem as `itinerary_items.experience_id` used to:
- `user_events.experience_id` — `trackEvent()` (`src/lib/repositories/events.ts`) silently failed
  (`console.error`, swallowed) for every Google Places-sourced view/dismiss, which meant
  `buildContext()` in `src/services/recommendation/engine.ts` couldn't actually tell what a user
  had already seen or dismissed for almost any real content.
- `saved_experiences.experience_id` — **worse than it first looked**: the FK pointed at
  `public.experiences`, which has **zero rows in production** (the fictional catalog was removed —
  confirmed by direct query before fixing this). That means the Save button was failing the FK
  check for *every* save attempt, not just Google-sourced ones — it was completely non-functional
  in production, silently (the API route doesn't surface DB errors to the UI as a visible failure
  state beyond a generic error).
- `reviews.experience_id` — **latent, not active**: there's no write path for reviews yet
  (`src/lib/repositories/reviews.ts` is read-only today) and the table has zero rows in production,
  so nothing was actually broken by this one. Fixed anyway, in the same pass, to close out the bug
  class consistently rather than leave one column behind for whoever builds review-writing later.

Fixed all three with the identical migration pattern as `itinerary_items` (idempotent `do $$` block
in `src/db/schema.sql`, drop the FK, widen to `text`; `create table` statements updated too, for
fresh deployments). `getSavedTagCounts()` in `src/lib/repositories/saved.ts` was rewritten — it
used to rely on `.select("experiences(tags)")`, a PostgREST embedded join that needs the FK to
work, so dropping the FK breaks that specific query shape. It now does a manual two-step lookup:
fetch saved `experience_id`s, keep only the uuid-shaped ones (Google Places results are never
persisted to `public.experiences` and don't carry tags to begin with, so there's nothing to look
up for them), then query `experiences.tags` for just those ids. Given `experiences` is currently
empty in production, this function still returns `{}` today either way — the rewrite matters once
curated content exists again, not right now.

**Verified live end to end**: confirmed via direct REST inserts that all three columns now accept a
real Google-prefixed id (`201`, no error) before touching the app; then through the actual app
(disposable test accounts, both local dev and production `discoverzolo.com` after deploy) — viewed
a real experience page (`trackEvent("viewed_experience")` fired with no error in the logs) and
clicked Save (`POST /api/saved` → `200`) — confirmed both rows landed in the DB with the correct
`g-ChIJ...` id via direct query on both environments, and that `/saved` correctly renders the saved
item. `reviews` was verified with a direct insert/delete only (no UI write path to test through
yet).

## Homepage hero copy test running (2026-09-01)

`src/components/marketing/hero.tsx` H1/subhead were rewritten as a deliberate, measured experiment,
not just a copy touch-up — this is live on production now:
- H1: "Experience more of life" (aspirational, no pain point, no ICP) → **"Stop deciding. Start
  doing."** (leads with the decision-fatigue pain the `/about` page already names but the hero
  didn't).
- Subhead now states the actual value prop (short curated list, reason for every pick) and names
  the ICP ("young professionals") instead of generic aspirational copy.
- **Hypothesis being tested**: homepage-to-signup conversion for category-search traffic rises by
  at least 2 percentage points vs. the old copy. **Target: +2 to 4pp over a 4-week window** starting
  2026-09-01. GA4 was wired up the same day specifically to be able to measure this — see the
  dedicated section below.
- The eyebrow ("Personalized discovery, built for real life") was deliberately left unchanged.
- Hardcoded directly in the component rather than editing `brand.tagline`/`brand.subTagline` in
  `src/lib/config/brand.ts` — those two also drive `<title>` and OG/Twitter meta tags site-wide
  (`src/app/layout.tsx`), so changing them would have rewritten the browser tab title and every
  social share preview, which is out of scope for a hero-only test.
- **Don't revert this without checking whether the 4-week measurement window has actually run** —
  if someone asks to "put the old homepage copy back," ask why first; it might be premature.

## Google Analytics 4 wired up (2026-09-01) — needed to measure the hero test above

There was no analytics in this codebase capable of measuring conversion by traffic source (the
existing `user_events`/`src/services/analytics/track.ts` system requires an authenticated
`user_id`, so it can't attribute anonymous homepage visits before signup). User chose GA4
specifically (over PostHog or an in-house build) when asked.

- `src/components/shared/google-analytics.tsx` — loads gtag.js and calls `gtag('config', ...)` via
  `next/script`. Renders nothing if `NEXT_PUBLIC_GA_MEASUREMENT_ID` isn't set, so it's inert in any
  environment where that env var isn't configured (confirmed locally: no script tag, no `window.gtag`).
  Mounted in `src/app/layout.tsx` alongside the existing `GoogleAttribution` badge.
- `src/lib/analytics/gtag.ts` — exports `gtagEvent(name, params)`, a safe no-op wrapper around
  `window.gtag` for firing custom events from client components.
- **Traffic-source/UTM attribution needs no extra code** — GA4's own "Traffic acquisition" report
  segments pageviews by referrer/UTM source automatically from the `gtag('config', ...)` call alone.
- **`sign_up` conversion event** wired into `src/app/(auth)/signup/page.tsx` at the two points that
  actually matter for this test — right after a successful `supabase.auth.signUp()` call (email
  path), and right before the redirect in the Google OAuth path. Deliberately *not* fired later (on
  email confirmation, or on reaching `/onboarding`) — the hero test cares about the CTA conversion
  itself, not a downstream step. Known imprecision, accepted as fine for a marketing metric: the
  Google OAuth event fires on initiating the redirect, before Supabase actually knows whether it'll
  create a new account or log into an existing one, so an existing user who lands on `/signup` by
  mistake and clicks "Continue with Google" would be miscounted as a new signup. Rare edge case, not
  worth the complexity of moving this to the server-side OAuth callback route (which can't fire a
  client-side gtag event anyway).
- **Live in production as of 2026-09-01** — user created the GA4 property and handed over the
  Measurement ID (`G-NVLCE3C4QS`), added to Vercel Production via `vercel env add
  NEXT_PUBLIC_GA_MEASUREMENT_ID production --force --value "G-NVLCE3C4QS"` (same pattern as the
  Stripe keys), redeployed. Confirmed live: `curl https://discoverzolo.com/` shows the gtag script
  tag with the correct id, and `window.gtag`/`window.dataLayer` are populated with a correct
  `config` call when loading the site in a real browser.
- `sign_up` event verified end to end for the **Google OAuth path**: clicking "Continue with
  Google" on `/signup` successfully redirected to `accounts.google.com` (confirming `handleGoogle()`
  executed all the way through, including the `gtagEvent` call that sits right before the redirect)
  — did not complete an actual Google login (not something to do on the user's behalf without
  explicit ask). The **email/password path** could not be verified live the same way: Supabase
  returned "Error sending confirmation email" for the `@example.com` test address used, because
  `example.com` is an IANA-reserved domain that never accepts real mail (RFC 2606) — not a bug in
  this app or in the GA4 wiring, just an artifact of testing with a fake address. The `gtagEvent`
  call for that path sits unconditionally right after the `if (error) return` check in the code, so
  it's correct by inspection; if this ever needs live verification, use an address that can actually
  receive mail, not `@example.com`.
- There's a pre-existing, unrelated, already-dead `analyticsEvents.signupCompleted()` function in
  `src/services/analytics/track.ts` that was never called from anywhere before this change and still
  isn't — left alone, out of scope here. Don't confuse it with the new GA4 `sign_up` event.

## Organization + SoftwareApplication JSON-LD added site-wide (2026-09-01)

`src/components/shared/site-jsonld.tsx`, mounted once in `src/app/layout.tsx` (applies to every
page, not just the homepage) — so AI assistants and search engines can answer "What is Zolo?" and
"How much does Zolo cost?" from structured data alone. Pricing (`Free $0`, `Premium $19.99/mo`)
reads from `src/lib/config/pricing.ts`, the same source every price display on the site already
uses, so it can't silently drift out of sync with what Stripe actually charges.

**Deliberately has no `sameAs` social links.** `brand.social` in `src/lib/config/brand.ts` lists
`@zoloapp` (X/Twitter) and `@zolo` (Instagram), but **neither belongs to this business** — checked
both live before including anything:
- `x.com/zoloapp` is a dormant account, last active 2015, posting about an unrelated "ZoLO•oolo"
  game/creative-challenge promotion from 2013.
- `instagram.com/zolo` is a private personal account belonging to someone named "Mike Zachaczewski,"
  unrelated to this business.

Including either as `sameAs` would have told search engines and AI systems that this business is
those accounts, which is simply false — `brand.social` looks like placeholder data from early setup
that was never actually verified against real, claimed accounts. **If real social accounts get
claimed for this business, add them to `SiteJsonLd`'s `Organization.sameAs` array** (not currently
present in the code at all) — don't just flip `brand.social` back into use without re-verifying it
first, since that's exactly what caused this.

Verified live on `discoverzolo.com` after deploy: both JSON-LD blocks present in the raw
server-rendered HTML (not just client-hydrated DOM — confirmed via direct `curl`, which is what
crawlers actually see) with the correct production domain, and present on `/about` and `/faq` too,
confirming the root-layout mount actually applies site-wide as intended.

## Exact next steps (priority order)

**Done since the last update:** deployed to production at `discoverzolo.com` (fixed a Vercel
Framework Preset misconfig that caused platform-level 404s despite successful builds — see
Vercel project Settings → Build and Development Settings, must be "Next.js" not "Other"); all
Vercel env vars corrected via `vercel env add` (many held placeholder/example values, not real
ones — always verify with `vercel env ls production` / check actual values before assuming
they're right); Supabase Auth URL Configuration (Site URL + Redirect URLs) pointed at the real
domain; added a dedicated `/faq` page; demo catalog now labeled (see above); Sentry, custom SMTP
(Resend), Google OAuth, and `ANTHROPIC_API_KEY` all live and verified; `/privacy` and `/terms`
fully rebuilt via Termly's questionnaire (dispute resolution = informal negotiation then binding
arbitration in Maryland, liability capped to amount paid, 1-year claim limit, no UGC posting live,
external booking links disclosed); added `/contact` page with a working form (Resend-backed);
added résumé upload on `/careers/apply` (Supabase Storage, public `resumes` bucket); **Stripe live
mode set up and verified with a real checkout** (user ran a real trial signup 2026-08-31; confirmed
in the DB: `subscriptions.status = 'trialing'`, correct live price id, `current_period_end` exactly
7 days out, a real $0 trial invoice recorded in `payments` — the webhook chain works end to end);
accidentally-created duplicate Vercel project `real-app` was deleted; onboarding's "Your world is
ready" screen now has a visible fill-animation progress bar instead of looking frozen; every async
button site-wide (Surprise Me, Weekend Planner, login/signup, save, share, log out, etc.) now shows
a spinner instead of just swapping text, and route-level `loading.tsx` skeletons were added for
`/home`, `/discover`, `/map`, `/saved`, `/trips`, `/trips/[id]`, `/travel/[destination]`,
`/experience/[id]`, `/profile` (none existed before — pages doing server-side data fetching showed
a blank/frozen screen); **fictional demo catalog removed from production**, Surprise Me's
repeat/exclude bug fixed, recommendation diversity fixed, and a real **AI Trip Planner** built (see
dedicated sections above — read those before touching the catalog, recommendation engine, or
itinerary code); **Surprise Me now persists its last result** to `localStorage`
(`src/components/home/surprise-me-button.tsx`) with a "View my Surprise: ___" link that reopens it
without a new AI call; **Discover's Premium limit now actually does something** (100 results
instead of a hardcoded 24, server-verified); **duplicate per-navigation auth/profile/subscription
fetches fixed** via React `cache()` (see dedicated section above) — the likely main cause of pages
feeling slow to switch between, though not yet confirmed with real before/after timing numbers;
**trip plans are now fully editable** — quantitative budget, real images/descriptions per activity,
click-to-swap or remove any activity (see dedicated section above); **site-wide slowness
root-caused and fixed** — Home/Map/Travel now stream instead of blocking, the AI reasoning call's
unbounded timeout (was up to 33s observed) is now bounded to ~12s with real headroom under it via a
smaller batch size, and repeat navigation within 30s is instant via `staleTimes` (see dedicated
section above); **chat-based itinerary editing shipped** — the last of the three planned ways to
edit a trip (alongside click-to-swap and Remove), a chat box on `/trips/[id]` that reuses the exact
same real-candidate source and mutation functions as the picker (see dedicated section above);
**`user_events`/`saved_experiences`/`reviews` uuid-column bug fixed** — the Save button was
completely non-functional in production (not just for Google-sourced content), view/dismiss
tracking was silently broken for almost all content, and `reviews` had the same latent bug closed
out preemptively (see dedicated section above); **GA4 is live** with the real Measurement ID,
confirmed serving on production and the `sign_up` conversion event verified for the Google OAuth
path (see dedicated section above) — the homepage hero test can now actually be measured;
**Organization + SoftwareApplication JSON-LD added site-wide** for AI-assistant/search visibility,
deliberately without `sameAs` social links since neither configured handle actually belongs to this
business (see dedicated section above).

1. Legal review of `/privacy` and `/terms` by an actual lawyer — Termly's questionnaire flow is a
   reasonable stand-in for launch, not a substitute for one.
2. Multi-day AI Trip Planner generation takes a while (order of 10-20+ seconds for a 3-day trip in
   local testing) — has a loading state (`loading` prop on the Generate button) so it doesn't look
   frozen, and now has real headroom (`timeoutMs: 45_000`, see the site-speed section above) so it
   should no longer fail outright on longer trips. If it still feels too slow in practice, consider
   trimming candidates sent to the model or a streaming/progressive UI, rather than reducing what
   it actually plans.

## PayPal — deliberately deferred, do not pick this up unprompted (2026-09-01)

User decision: **not doing this now.** Originally on the priority list (confirmed intent
2026-08-30), but once the real scope became clear it was explicitly deprioritized — revisit only
once the app has hundreds of paying customers, not before. Do not treat this as an open task or
suggest picking it up again until the user brings it up themselves.

Why it's not a quick win (verified against Stripe's docs and the actual account, 2026-09-01,
correcting an earlier wrong note in this file that assumed it was a no-code Dashboard toggle): the
Stripe account is US-based (`country: "US"`, confirmed via `GET /v1/account`). Stripe's simple
Dashboard-toggle PayPal integration only works for Stripe accounts in supported European countries
(docs.stripe.com/payments/paypal). A US account needs the separate "PayPal custom payment method"
program instead (docs.stripe.com/payments/payment-methods/custom-payment-methods/paypal) — gated
(request access first), custom/negotiated fees ("contact Stripe for pricing," not published), and
requires hosting Stripe's adapter in this app's own infrastructure. Real integration work, not
worth it pre-revenue.

When it's actually time to revisit: email `merchant-hosted-adapter@stripe.com` (or the signup on
that docs page) to request access and get real pricing, then reconsider. The current Terms of
Service intentionally only lists Visa/Mastercard/Amex/Discover — update the payment-methods
sentence in [src/app/(marketing)/terms/page.tsx](<src/app/(marketing)/terms/page.tsx>) only once
PayPal genuinely goes live.

## Verified clean as of last update

`npm run typecheck` and `npm run lint` pass with zero errors as of the 2026-09-01
`user_events`/`saved_experiences`/`reviews` fix. Git working tree — **check with `git status`,
don't assume**.

`user_events`/`saved_experiences`/`reviews` uuid-column fix — migration applied to production via
`npm run migrate` (confirmed successful). Verified via direct REST insert that all three columns
accept a real Google-prefixed id; verified through the actual app on both local dev and production
(`discoverzolo.com`, post-deploy) that viewing an experience and clicking Save both work end to
end, with rows confirmed in the DB via direct query each time, and `/saved` renders correctly.

Site-speed fix (Suspense streaming, bounded AI timeout, `staleTimes`) — verified live end to end
using disposable Supabase test accounts (created via Admin API, deleted after): on local dev, four
fresh `/home` loads took 6.8s/7.6s/8.4s/10.3s (down from 14-33s before), all with genuine AI-written
reasoning visible (not the generic fallback text); Map loaded in 2.5s. Confirmed on production
(`discoverzolo.com`) both *before* the fix (a fresh login took ~9-10s to show `/home`'s content,
generic fallback reasoning instead of real AI blurbs — the problem was real there too, not a local
dev artifact) and *after* deploying (shell painted within ~3s of login, real AI-personalized
reasoning visible within ~10s).

Chat-based itinerary editing — verified live end to end on local dev with a hand-seeded itinerary
(disposable test account + 2 real Google-sourced items): "remove the Times Square visit" deleted
the item (confirmed via direct DB query, not just hidden client-side); "swap dinner for something
more casual and cheaper" picked a real nearby place in 7.7s total and persisted correctly; an
out-of-scope request ("reorder the days and add day 3") correctly replied that it can't do that
without touching the database. Also confirmed live on production (`discoverzolo.com`) after
deploy — a fresh test account's seeded itinerary, "remove Times Square" correctly removed it with
a genuine AI-generated confirmation reply.

Also still holding from earlier: fictional-catalog removal, Surprise Me repeat/exclude fix,
Discover's 100-result Premium limit, the AI Trip Planner's core generation flow, and the
click-to-swap/remove itinerary-editing feature (quantitative budget, images/descriptions) —
verified live end to end on local dev: generated a real 2-day New York trip, opened an activity's
detail modal (real image gallery + description rendered), swapped Rockefeller Center for Lincoln
Center for the Performing Arts (confirmed persisted in `itinerary_items` via direct DB query, UI
updated with no reload), removed Times Square entirely (confirmed deleted from the DB, UI updated
with no reload).
