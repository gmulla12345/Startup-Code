# Zolo — Experience More of Life

Zolo is an AI-powered discovery platform that answers one question: **"What should I do next?"** It learns who you are — your interests, personality, budget, and behavior — and recommends real-world experiences, adventures, and hidden gems instead of an endless list of search results.

This repository is a production-oriented foundation for that product: a Next.js 16 App Router application with Supabase (auth + Postgres + RLS), a Claude-powered hybrid recommendation engine, and Stripe subscriptions — built to run with **zero external services configured** (using realistic mock data) and to become a real, deployed product as credentials are added.

---

## Table of contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Running without credentials](#running-without-credentials)
5. [Environment variables](#environment-variables)
6. [Supabase setup](#supabase-setup)
7. [Stripe setup](#stripe-setup)
8. [AI (Anthropic) setup](#ai-anthropic-setup)
9. [Maps setup](#maps-setup)
10. [Local development](#local-development)
11. [Testing](#testing)
12. [Deployment (Vercel)](#deployment-vercel)
13. [Troubleshooting](#troubleshooting)
14. [Future architecture](#future-architecture)

---

## Architecture

```
src/
  app/                     # Next.js App Router
    (marketing)/           # Public landing page
    (auth)/login|signup|reset-password
    (app)/                 # Authenticated shell (sidebar + bottom nav)
      home/ discover/ map/ trips/ saved/ profile/
      experience/[id]/     # Public detail page (no auth required)
      travel/[destination]/# Public Travel Mode destination page
    admin/                 # Admin dashboard (role-gated)
    api/                   # Route Handlers (REST-ish JSON API)
    onboarding/            # Multi-step onboarding wizard
    share/itinerary/[id]/  # Public itinerary share page
  components/
    ui/                    # Design system primitives (Button, Card, Input...)
    marketing/ onboarding/ experience/ home/ discover/ map/ trips/ profile/ admin/
    layout/                # Sidebar, bottom nav, app shell
  lib/
    supabase/              # Browser/server/admin/middleware Supabase clients
    stripe/                # Stripe client, checkout, webhook handlers
    repositories/          # Typed data access (profile, saved, events, ...)
    validation/            # zod schemas for API input
    config/                # brand.ts, pricing.ts, taxonomy.ts (no hard-coded copy)
    api/                   # requireUser/requireAdmin, rate limiting
    utils/                 # geo, formatting, cn, share
  services/
    providers/             # ExperienceProvider / PlacesProvider / EventsProvider /
                            # TravelProvider abstractions + mock & Supabase impls
    recommendation/        # Deterministic hybrid scoring engine
    analytics/             # Client-side event tracking helper
  ai/
    client.ts              # Single Anthropic SDK entry point (structured tool calls)
    recommend.ts            # AI reasoning layer on top of the scorer
    weekend-plan.ts          # AI itinerary generation
    schema.ts                # zod validation for all AI structured output
  types/                   # Domain types (database.ts, ai.ts)
  db/
    schema.sql              # Full Postgres schema + RLS policies
    seed-data.ts             # Shared demo catalog (mock provider + seed script)
scripts/
  seed-supabase.ts           # Populates a real Supabase project from seed-data.ts
```

### Key design decisions

- **Provider abstraction** (`services/providers`): nothing in the app talks to Google Places, a database, or an events API directly. Every data source implements a small interface (`ExperienceProvider`, `PlacesProvider`, `EventsProvider`, `TravelProvider`) with a mock implementation for local dev and a real implementation that activates automatically once credentials are present. `ResilientExperienceProvider` also falls back to mock data if a configured Supabase call fails (e.g. schema not migrated yet), so partial configuration never crashes the app.
- **AI is one layer among three** (`services/recommendation/engine.ts`): every recommendation goes through (1) structured filtering via the provider, (2) a deterministic, explainable scoring function (`services/recommendation/scoring.ts`), and only then (3) optional AI reasoning (`ai/recommend.ts`) that can refine scores and add natural-language explanations — validated against a zod schema and restricted to the candidate set the scorer already produced, so the model can never invent an experience, price, or address. If `ANTHROPIC_API_KEY` is unset or the call fails, the app silently uses step (2)'s output.
- **Brand name is centralized** in `lib/config/brand.ts` — renaming the product touches one file.
- **Pricing is centralized** in `lib/config/pricing.ts` — the Stripe price ID drives checkout; the displayed numbers are just for read that config.
- **RLS everywhere**: `src/db/schema.sql` enables Row Level Security on every table. The service-role client (`lib/supabase/admin.ts`) is used only in webhooks and admin routes, always behind an explicit `requireAdmin()` check.

### Technology stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, RLS) · Anthropic Claude (`@anthropic-ai/sdk`) · Stripe · MapLibre GL (via `react-map-gl/maplibre`, no API key required) · zod · Vitest

---

## Prerequisites

- **Node.js 20+** and npm
- A **Supabase** project (free tier is fine) — optional for browsing, required for auth/personalization
- An **Anthropic API key** — optional, enables AI-generated reasoning
- A **Stripe** account — optional, enables the Premium subscription flow
- A **Google Cloud** Maps/Geocoding API key — optional, enables live city geocoding (a small built-in city list is used otherwise)

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With `.env.local` empty, the app runs fully on mock data — see the next section.

## Running without credentials

Every external integration degrades gracefully instead of crashing:

| Feature | Without credentials | With credentials |
|---|---|---|
| Browsing, landing page, experience/travel pages | Full mock catalog (`src/db/seed-data.ts`) | Live Supabase-backed catalog |
| Sign up / log in | Auth calls fail with a toast (no crash) | Full email/password + Google OAuth |
| Recommendations / Surprise Me / Weekend Planner | Deterministic hybrid scorer with templated reasoning | Same, plus Claude-generated natural-language reasoning |
| Weather context | Live via Open-Meteo (no key needed) | — |
| Map | Free OpenFreeMap tiles, no key needed | Optional custom style via `NEXT_PUBLIC_MAP_STYLE_URL` |
| City geocoding | Small built-in list of ~16 major cities | Live Google Geocoding |
| Premium upgrade | Clear "billing not configured" message | Full Stripe Checkout + Customer Portal |
| Admin dashboard | Reachable but reads empty Supabase-backed tables | Full user/experience management |

This is implemented in `src/lib/supabase/env.ts` (safe client construction), `services/providers/index.ts` (provider selection), and `ai/client.ts` / `lib/stripe/client.ts` (`isAIConfigured()` / `isStripeConfigured()` checks).

## Environment variables

See [`.env.example`](.env.example) for the full list with inline explanations. Only variables actually read by the code are listed — never commit `.env.local`.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Project Settings → API: copy the **Project URL** and **anon public key** into `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Copy the **service_role key** into `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose it).
3. Open the SQL Editor and run the contents of [`src/db/schema.sql`](src/db/schema.sql) once. It's idempotent (safe to re-run).
4. Enable the **Google** provider under Authentication → Providers if you want Google sign-in, and add `http://localhost:3000/auth/callback` (and your production URL) to the redirect allow-list.
5. Populate demo data into your real project:
   ```bash
   npm run seed
   ```
   This upserts categories, experiences, and destinations from `src/db/seed-data.ts` — the same data the mock provider uses locally, so switching to Supabase doesn't change what you see.
6. Set `ADMIN_EMAIL` to your account's email to unlock `/admin`.

## Stripe setup

1. Create a Product + a $19.99/month recurring Price in the [Stripe Dashboard](https://dashboard.stripe.com/products). Copy the Price ID into `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID`.
2. Copy your secret and publishable keys into `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. In dev, forward webhooks with the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`.
4. In production, add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` listening for `checkout.session.completed`, `customer.subscription.*`, and `invoice.paid`/`invoice.payment_failed`.
5. Enable the [Customer Portal](https://dashboard.stripe.com/settings/billing/portal) so users can self-manage/cancel from Profile.

Webhook signature verification happens in `src/app/api/stripe/webhook/route.ts`; all subscription state changes are mirrored into the `subscriptions` table by `src/lib/stripe/webhook-handlers.ts` — the client never trusts a locally-stored subscription flag.

## AI (Anthropic) setup

1. Get a key at [console.anthropic.com](https://console.anthropic.com).
2. Set `ANTHROPIC_API_KEY`. Optionally override `ANTHROPIC_MODEL`.

All AI calls go through `src/ai/client.ts`'s `callStructuredTool()`, which forces a tool-call response (structured JSON, not free text) and validates it against a zod schema (`src/ai/schema.ts`) before it's ever rendered — the model can only reason about experiences already selected by the deterministic scorer, and any invalid/failed response falls back to that scorer's own output silently.

## Maps setup

- The interactive Map page (`/map`) uses **MapLibre GL** with the free [OpenFreeMap](https://openfreemap.org) "liberty" style by default — no key required. Override with `NEXT_PUBLIC_MAP_STYLE_URL` for a custom style (e.g. a Mapbox style URL with your own token embedded).
- City search (onboarding, "where are you headed") uses Google's Geocoding API when `MAPS_API_KEY` is set (Google Cloud Console → enable "Geocoding API"), otherwise a small built-in city list in `services/providers/mock-places-provider.ts`.

## Local development

```bash
npm run dev          # start the dev server (Turbopack)
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test          # Vitest unit tests
npm run build          # production build
npm run seed            # populate a real Supabase project with demo data
```

## Testing

`src/__tests__/` covers what's meaningfully unit-testable without a live Supabase/Stripe/Anthropic account:

- **Recommendation logic** — `scoring.test.ts` (interest overlap, distance decay, dismissal penalty, ranking order)
- **Subscription state** — `subscriptions.test.ts` (`isPremium` across every Stripe status)
- **API validation** — `validation.test.ts` (every zod schema used by a Route Handler)
- **Database operations** — `mock-experience-provider.test.ts` (exercises the same `ExperienceProvider` contract `SupabaseExperienceProvider` implements)
- **AI service handling** — `ai-fallback.test.ts` (confirms the AI layer degrades to the deterministic scorer, unmodified, when unconfigured)
- **Authentication (API layer)** — `api-auth.test.ts` (`ApiError` → HTTP status mapping, no leaked internals on 500)
- **Geo utilities** — `geo.test.ts`

Run with `npm run test`. For full integration coverage (real auth flows, live RLS enforcement, real Stripe webhooks), point a Supabase staging project's credentials at `.env.local` and test manually or with Playwright — that's intentionally out of scope for a credential-free CI run.

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add every variable from `.env.example` that you're using in Project Settings → Environment Variables.
4. Set `NEXT_PUBLIC_APP_URL` to your production domain (used in metadata and Stripe redirect URLs).
5. Point your Stripe webhook and Supabase OAuth redirect URLs at the production domain.
6. Deploy. `next build` runs automatically; the app is fully server-rendered where it needs to be (auth, personalization) and static where it can be (marketing pages).

## Troubleshooting

- **"Your project's URL and Key are required to create a Supabase client"** — this is caught internally (see `lib/supabase/env.ts`); if you see it in your own new code, make sure you're importing `createClient` from `lib/supabase/server.ts` or `client.ts`, not calling `@supabase/ssr` directly.
- **Signup/login does nothing** — `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` aren't set or are wrong; check the browser console network tab for the failed request.
- **Stripe checkout button shows an error toast** — `STRIPE_SECRET_KEY` or `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` is missing; see [Stripe setup](#stripe-setup).
- **Recommendations show generic reasoning instead of personalized text** — `ANTHROPIC_API_KEY` isn't set; this is expected fallback behavior, not a bug.
- **Map doesn't render tiles** — check for an ad blocker/network restriction on `tiles.openfreemap.org`, or set `NEXT_PUBLIC_MAP_STYLE_URL` to an alternative style.
- **`/admin` redirects you to `/home`** — set `ADMIN_EMAIL` to your account's email (or set `app_metadata.role = "admin"` on the user in Supabase).

## Future architecture

The codebase is structured so the following can be added without restructuring:

- Native iOS/Android apps consuming the same `src/app/api/*` JSON API
- A real ML ranking model replacing/augmenting `services/recommendation/scoring.ts` (same `ScoredExperience` output shape)
- A real events provider (Eventbrite/Ticketmaster) implementing `EventsProvider`
- Expanded social features (`follows`, `social_profiles`, `shares` tables already exist with RLS)
- Push/email notifications (event types already tracked in `user_events`; see spec section 38 for the intended notification triggers)
- Group trips, booking infrastructure, and loyalty/rewards, all addable as new tables + provider implementations without touching the recommendation engine's interface
