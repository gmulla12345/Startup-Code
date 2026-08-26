@AGENTS.md

# Zolo — Project State

> Read this before doing anything else in this repo. It reflects the state as of the
> last update below — verify anything critical (git log, file contents) rather than
> trusting this blindly if it's been a while.
>
> Full setup/architecture docs: [README.md](README.md). Full DB schema: [src/db/schema.sql](src/db/schema.sql).

**Last updated:** 2026-08-25

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
- **Vercel**: user has imported the repo. First deploy failed — Turbopack's production build
  crashed silently on Vercel's Linux build image (zero output, not even Next's banner line).
  Fixed by changing `package.json`'s `build` script to `next build --webpack` (commit
  `02003d9`). **Not yet confirmed whether the redeploy after that fix succeeded** — check
  Vercel dashboard first if continuing deploy work.
- **Environment variables**: real credentials exist in the user's local `.env.local` (gitignored,
  never pushed — see below for what's populated). **Vercel almost certainly does NOT have these
  yet** — that's the next concrete blocker for a working production deployment. Nothing has
  confirmed they were added to Vercel's project settings.

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
  is intentionally fictional/placeholder content for a working demo. **User was told explicitly**:
  before real users see this, either label it as editorial/demo picks or replace with verified
  real listings — presenting fictional businesses as real was flagged as the one thing to fix
  before wider launch. Not yet resolved either way.
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

1. Confirm the Vercel redeploy after the webpack fix actually succeeded.
2. Add all populated `.env.local` values to Vercel project settings (Supabase, Stripe, Maps,
   admin email — skip `DATABASE_URL`, that's local-only for migrations).
3. Get a production `STRIPE_WEBHOOK_SECRET` (Stripe Dashboard → webhook endpoint pointed at the
   real Vercel domain) so subscription status actually updates after checkout.
4. Decide what to do about the demo catalog before real users arrive (see above).
5. Everything else from the "launch checklist" the user asked for earlier: custom SMTP, Google
   OAuth, `ANTHROPIC_API_KEY`, legal review of `/privacy` and `/terms`, error monitoring.

## Verified clean as of last update

`npm run typecheck`, `npm run lint`, `npm run test` (34/34 passing), and `npm run build`
(webpack) all pass with zero errors. Git working tree clean, all work pushed to `main`.
