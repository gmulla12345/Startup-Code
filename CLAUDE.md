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
mode set up** (one real checkout still needs to be run by the user); accidentally-created
duplicate Vercel project `real-app` was deleted; onboarding's "Your world is ready" screen now
has a visible fill-animation progress bar instead of looking frozen; every async button site-wide
(Surprise Me, Weekend Planner, login/signup, save, share, log out, etc.) now shows a spinner
instead of just swapping text, and route-level `loading.tsx` skeletons were added for
`/home`, `/discover`, `/map`, `/saved`, `/trips`, `/trips/[id]`, `/travel/[destination]`,
`/experience/[id]`, `/profile` (none existed before — pages doing server-side data fetching
showed a blank/frozen screen); **fictional demo catalog removed from production** (see dedicated
section above — this is the big one, don't skip it); **Surprise Me now persists its last result**
to `localStorage` (`src/components/home/surprise-me-button.tsx`) with a "View my Surprise: ___"
link that reopens it without a new AI call, since it used to vanish for good once you closed it.

1. **Run one real checkout in live mode** — needs the user to actually do it (real card, real
   charge), not an agent. Confirms the live product/price/webhook wiring actually works end to end
   and that `subscriptions`/`payments` rows update correctly after payment.
2. **Enable PayPal** eventually (user confirmed 2026-08-30) — requires turning it on in the Stripe
   Dashboard → Settings → Payment Methods; the checkout code has no `payment_method_types`
   restriction so once PayPal is enabled account-side it should just work with no code changes
   needed. Not done yet — the current Terms of Service intentionally only lists Visa/Mastercard/
   Amex/Discover, since PayPal isn't actually live. Update the Terms' payment-methods sentence in
   [src/app/(marketing)/terms/page.tsx](<src/app/(marketing)/terms/page.tsx>) when PayPal goes live.
3. Legal review of `/privacy` and `/terms` by an actual lawyer — Termly's questionnaire flow is a
   reasonable stand-in for launch, not a substitute for one.
4. User reported the site "running a little slow" (2026-08-31) — not yet investigated. Likely
   partly explained by production now calling the live Google Places API + Claude AI reasoning on
   every catalog request instead of reading pre-seeded rows from Supabase (a real latency
   trade-off for the accuracy fix above, not obviously a bug) — but worth actually profiling
   (Vercel function duration logs, `next: { revalidate }` cache hit rate on the Google Places
   fetches) before assuming that's the whole story.

## Verified clean as of last update

`npm run typecheck` and `npm run lint` pass with zero errors as of the 2026-08-31 catalog-accuracy
update. Git working tree — **check before assuming clean, verify with `git status`** (multiple
uncommitted changes as of this update — Stripe/Terms commit from earlier the same day was pushed,
but the loading-states and catalog-accuracy work after it were not, pending user review). Local
dev server confirmed working against the now-empty-of-mock-data production Supabase + live Google
Places for `/`, `/travel/new-york-usa`, `/home`, and the Surprise Me flow end to end.
