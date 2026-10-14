import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guards for Phase 4's database changes, read from the SQL itself (and rehearsed
// against the real database in a rolled-back transaction before they were applied).

const root = join(__dirname, "../db");
const schema = readFileSync(join(root, "schema.sql"), "utf-8");
const links = readFileSync(join(root, "migrations/20261020_01_share_links.sql"), "utf-8");
const owner = readFileSync(join(root, "migrations/20261020_02_itineraries_owner_only.sql"), "utf-8");

const code = (sql: string) => sql.replace(/--[^\n]*/g, "");
const tableOf = (sql: string) => sql.match(/create table if not exists public\.share_links \(([\s\S]*?)\n\);/)?.[1] ?? "";

describe("the share_links table", () => {
  it("is closed to every browser key, with no policy and no grant that opens it", () => {
    expect(links).toMatch(/alter table public\.share_links enable row level security/);
    expect(links).toMatch(/revoke all on public\.share_links from anon, authenticated/);
    expect(code(links)).not.toMatch(/create policy[^;]*share_links/i);
    expect(code(links)).not.toMatch(/grant [^;]*share_links/i);
  });

  it("holds an unguessable token: unique, and only in the exact 22-character shape", () => {
    expect(tableOf(links)).toMatch(/token text not null unique check \(token ~ '\^\[A-Za-z0-9_-\]\{22\}\$'\)/);
  });

  it("is removed with the account, and with the plan it points at", () => {
    expect(tableOf(links)).toMatch(/user_id uuid not null references auth\.users\(id\) on delete cascade/);
    expect(tableOf(links)).toMatch(/itinerary_id uuid references public\.itineraries\(id\) on delete cascade/);
  });

  it("points at exactly one thing: a place or a plan, never both and never neither", () => {
    expect(tableOf(links)).toMatch(/kind = 'place' and place_id is not null and itinerary_id is null/);
    expect(tableOf(links)).toMatch(/kind = 'plan' and itinerary_id is not null and place_id is null/);
    expect(tableOf(links)).toMatch(/kind text not null check \(kind in \('place', 'plan'\)\)/);
  });

  it("stores the place id and nothing else from Google, and no name, email, location or date of the person", () => {
    const columns = [...tableOf(links).matchAll(/^ {2}([a-z_]+) /gm)].map((m) => m[1]).filter((c) => c !== "constraint");
    expect(columns).toEqual(["id", "token", "user_id", "kind", "place_id", "itinerary_id", "note", "show_name", "created_at"]);
  });

  it("keeps the name private unless the sharer says otherwise, and the note short", () => {
    expect(tableOf(links)).toMatch(/show_name boolean not null default false/);
    expect(tableOf(links)).toMatch(/note text check \(note is null or char_length\(note\) between 1 and 140\)/);
  });

  it("allows one live link per person per target, so sharing twice updates rather than multiplies", () => {
    expect(links).toMatch(/unique index if not exists uniq_share_links_place on public\.share_links \(user_id, place_id\) where kind = 'place'/);
    expect(links).toMatch(/unique index if not exists uniq_share_links_plan on public\.share_links \(user_id, itinerary_id\) where kind = 'plan'/);
  });

  it("only accepts a place id of the shape Google uses", () => {
    expect(tableOf(links)).toMatch(/char_length\(place_id\) between 10 and 300 and place_id ~ '\^\[A-Za-z0-9_-\]\+\$'/);
  });

  it("uses no regular-expression repeat count above 255, which Postgres only refuses when a row is checked", () => {
    // A {10,300} here made a table that was created fine and then rejected every place link.
    // The rehearsal against the real database caught it; this keeps it from coming back.
    const repeats = [...links.matchAll(/\{(\d+)(?:,(\d+))?\}/g)].map((m) => Number(m[2] ?? m[1]));
    expect(repeats.length).toBeGreaterThan(0);
    for (const n of repeats) expect(n).toBeLessThanOrEqual(255);
  });
});

describe("the anonymous usage count", () => {
  it("is a server-only function, never callable from a browser", () => {
    expect(links).toMatch(/revoke all on function public\.usage_units_for_feature_since\(text, timestamptz\) from public, anon, authenticated/);
    expect(links).toMatch(/grant execute on function public\.usage_units_for_feature_since\(text, timestamptz\) to service_role/);
  });

  it("counts places units for one feature since a time, only successful calls", () => {
    const fn = links.match(/create or replace function public\.usage_units_for_feature_since[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toMatch(/e\.feature = p_feature/);
    expect(fn).toMatch(/e\.bucket = 'places'/);
    expect(fn).toMatch(/e\.created_at >= p_since/);
    expect(fn).toMatch(/e\.outcome = 'ok'/);
  });
});

describe("the share_links migration", () => {
  it("only adds: nothing is dropped, deleted, truncated or altered beyond the new table", () => {
    const sql = code(links).replace(/^\s*revoke[^;]*;/gim, "");
    expect(sql).not.toMatch(/\bdrop (table|view|column|function|policy|index)\b/i);
    expect(sql).not.toMatch(/\bdelete from\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql.match(/\balter table [^;]*;/gi)).toEqual(["alter table public.share_links enable row level security;"]);
  });

  it("is mirrored in schema.sql", () => {
    const body = links.slice(links.indexOf("create table if not exists public.share_links"), links.indexOf("commit;")).trimEnd();
    expect(schema).toContain(body);
  });
});

describe("closing the old way of sharing a plan", () => {
  it("lets only the owner read an itinerary or its stops: the public-read policies are gone", () => {
    const sql = code(owner);
    expect(sql).toMatch(/drop policy if exists "own or public itineraries" on public\.itineraries/);
    expect(sql).toMatch(/create policy "own itineraries" on public\.itineraries for select using \(auth\.uid\(\) = user_id\)/);
    const created = sql.match(/create policy[^;]*;/gi) ?? [];
    expect(created).toHaveLength(2);
    for (const policy of created) expect(policy).not.toMatch(/is_public/);
  });

  it("touches no row, and drops only the two policies it replaces", () => {
    const sql = code(owner);
    expect(sql).not.toMatch(/\b(delete from|truncate|update public|insert into|alter table|drop table|drop column)\b/i);
    expect(sql.match(/drop policy if exists "[^"]+" on [a-z_.]+/gi)).toEqual([
      'drop policy if exists "own or public itineraries" on public.itineraries',
      'drop policy if exists "own itineraries" on public.itineraries',
      'drop policy if exists "itinerary items via parent" on public.itinerary_items',
    ]);
  });

  it("is what schema.sql says now: no policy anywhere lets anyone but the owner read an itinerary", () => {
    const policies = schema.match(/create policy "[^"]*" on public\.itiner[a-z_]+[^;]*;/gi) ?? [];
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of policies) expect(policy, policy).not.toMatch(/is_public/);
    expect(schema).not.toMatch(/create policy "own or public itineraries"/);
  });
});
