@AGENTS.md

# Zolo — Project State

> Read this before doing anything else in this repo. It reflects the state as of the
> last update below — verify anything critical (git log, file contents) rather than
> trusting this blindly if it's been a while.
>
> Full setup/architecture docs: [README.md](README.md). Full DB schema: [src/db/schema.sql](src/db/schema.sql).

**Last updated:** 2026-08-27

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

## What's configured locally (`.env.local`) vs. still needed

Populated with real values already:
- Supabase (URL, anon/publishable key, service role/secret key) — project ref `pfdfphtdkriflrclczwn`,
  schema applied, seed data loaded (24 experiences, categories, 3 destinations)
- `ADMIN_EMAIL=gledimulla@gmail.com` (their real account, confirmed working, has admin access)
- Google Maps API key (`MAPS_API_KEY`) — Places API confirmed enabled and working
- Stripe **test-mode** keys, plus a real "Zolo Premium" $19.99/mo product+price created via API
  (`NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` is set). Checkout verified working end-to-end.
- `DATABASE_URL` — direct Postgres connection, used only by `scripts/migrate.ts`

Still empty / not done:
- `ANTHROPIC_API_KEY` — AI recommendations currently run on the deterministic fallback only
  (see "Hybrid recommendation engine" below). Adding this unlocks Claude-generated reasoning.
- `STRIPE_WEBHOOK_SECRET` — empty. Checkout works but subscription status won't flip to
  Premium in the DB after payment until this is set (webhook can't reach localhost; needs
  Stripe CLI locally or a real webhook endpoint once deployed).
- Google OAuth is NOT enabled in Supabase Auth — "Continue with Google" button exists in the UI
  but will error until the user adds a Google Cloud OAuth client and enables the provider.
- Custom SMTP for Supabase Auth emails — still using Supabase's default low-volume mailer.
- No error monitoring (Sentry etc.) wired up anywhere.

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

- Demo catalog (Baltimore/DC/NYC/Tokyo, ~24 hand-written experiences in `src/db/seed-data.ts`)
  is intentionally fictional/placeholder content for a working demo. **Resolved 2026-08-27**:
  `sourceProvider: "mock"` listings now show an "Editorial pick" badge + disclosure on the detail
  page ([src/app/(app)/experience/[id]/page.tsx](src/app/(app)/experience/[id]/page.tsx)), so
  they're not mistaken for verified real-time listings. Google Places-sourced experiences are
  unaffected (they're real).
- All demo catalog images were individually audited and fixed for a real mismatch bug (13 of them
  were generic/wrong stock photos, e.g. a tropical beach photo on a "Chesapeake Bay Lighthouse"
  listing). All now visually verified to match their listing. Google Places-sourced experiences
  use real Google Photos of the actual place, not stock photos.
- A real prefix-matching bug in route protection was found and fixed (`/map` was matching
  `/map-debug` via naive `startsWith`) — `src/lib/supabase/middleware.ts` now matches full path
  segments.
- The app runs fully with zero credentials configured (mock data, graceful fallbacks everywhere)
  — this is by design, not a bug, and is covered by `src/lib/supabase/env.ts` and the provider
  factory's `isSupabaseConfigured()` checks.

## Exact next steps (priority order)

**Done since the last update:** deployed to production at `discoverzolo.com` (fixed a Vercel
Framework Preset misconfig that caused platform-level 404s despite successful builds — see
Vercel project Settings → Build and Development Settings, must be "Next.js" not "Other"); all
Vercel env vars corrected via `vercel env add` (many held placeholder/example values, not real
ones — always verify with `vercel env ls production` / check actual values before assuming
they're right); Supabase Auth URL Configuration (Site URL + Redirect URLs) pointed at the real
domain; added a dedicated `/faq` page; demo catalog now labeled (see above).

1. **Stripe live mode** — blocked on the user activating their Stripe account (business/bank/
   identity — cannot be done by an agent). Once they share a live secret key: create the $19.99/mo
   product+price in live mode, create a webhook endpoint at `https://discoverzolo.com/api/stripe/webhook`,
   push the 4 live env vars via `vercel env add`, test one real checkout. **Also add a free trial**
   at this point — user confirmed there will be one (2026-08-30), ask how many days (7 or 14 are
   typical) and add `trial_period_days` to the Checkout Session in
   [src/lib/stripe/checkout.ts](src/lib/stripe/checkout.ts) (currently has no trial logic at all —
   confirmed by grep, so don't assume it's already there). The Terms of Service being generated via
   Termly already answers "yes" to offering a free trial, so the code needs to actually match that
   before launch. **Also enable PayPal** eventually (user confirmed 2026-08-30) — requires turning
   it on in the Stripe Dashboard → Settings → Payment Methods; the checkout code has no
   `payment_method_types` restriction so once PayPal is enabled account-side it should just work
   with no code changes needed. Not done yet — the current Terms of Service intentionally only
   lists Visa/Mastercard/Amex/Discover, since PayPal isn't actually live.
2. Google OAuth — needs the user to create a Google Cloud OAuth client themselves.
3. Custom SMTP for Supabase Auth — needs the user to sign up with a provider (Resend/Postmark/etc).
4. `ANTHROPIC_API_KEY` — needs the user's own Anthropic console key.
5. Error monitoring (Sentry or similar) — needs an account created by the user.
6. Legal review of `/privacy` and `/terms` by an actual lawyer.
7. Stray cleanup: an accidentally-created duplicate Vercel project named `real-app` (from a
   `vercel link` mistake) still needs manual deletion — Vercel dashboard → that project →
   Settings → Delete Project. Deleting it via CLI is blocked by this environment's permission
   classifier as a destructive action.

## Verified clean as of last update

`npm run typecheck` passes with zero errors as of the 2026-08-27 catalog-labeling commit. Git
working tree clean, all work pushed to `main`. Production deploy confirmed live and working at
`https://discoverzolo.com` (signup/login verified working after the env var fix).
