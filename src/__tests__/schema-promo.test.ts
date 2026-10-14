import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guards for Phase 3's database changes, read from the SQL itself (and rehearsed
// against the real database in a rolled-back transaction before it was applied).

const root = join(__dirname, "../db");
const schema = readFileSync(join(root, "schema.sql"), "utf-8");
const migration = readFileSync(join(root, "migrations/20261019_01_promo_redemptions.sql"), "utf-8");

const body = (sql: string) => sql.match(/create table if not exists public\.promo_redemptions[\s\S]*?commit;|create table if not exists public\.promo_redemptions[\s\S]*$/)?.[0] ?? "";

describe("the promo redemptions table", () => {
  it("allows one redemption per person", () => {
    expect(migration).toMatch(/user_id uuid unique references auth\.users\(id\) on delete set null/);
  });

  it("is closed to every browser key, and has no policy that opens it", () => {
    expect(migration).toMatch(/alter table public\.promo_redemptions enable row level security/);
    expect(migration).toMatch(/revoke all on public\.promo_redemptions from anon, authenticated/);
    expect(migration).not.toMatch(/create policy[^;]*promo_redemptions/i);
  });

  it("de-identifies a redemption when the account is deleted, rather than keeping the person", () => {
    expect(migration).toMatch(/on delete set null/);
    expect(migration).not.toMatch(/on delete cascade/);
  });

  it("is either pending, or redeemed with a time: never one without the other", () => {
    expect(migration).toMatch(/status in \('pending', 'redeemed'\)/);
    expect(migration).toMatch(/check \(\(status = 'redeemed'\) = \(redeemed_at is not null\)\)/);
  });

  it("only accepts codes of the shape Stripe allows", () => {
    expect(migration).toMatch(/code ~ '\^\[A-Z0-9-\]\{2,64\}\$'/);
  });

  it("stores nothing about the person but who: no email, no name, no address", () => {
    const table = migration.match(/create table if not exists public\.promo_redemptions \(([\s\S]*?)\n\);/)?.[1] ?? "";
    const columns = [...table.matchAll(/^ {2}([a-z_]+) /gm)].map((m) => m[1]).filter((c) => c !== "constraint");
    expect(columns).toEqual([
      "id",
      "user_id",
      "code",
      "stripe_promotion_code_id",
      "stripe_checkout_session_id",
      "stripe_subscription_id",
      "status",
      "created_at",
      "redeemed_at",
    ]);
  });
});

describe("the admin view of it", () => {
  it("is readable only by the server", () => {
    expect(migration).toMatch(/revoke all on public\.v_promo_redemptions_by_code from anon, authenticated/);
    expect(migration).toMatch(/grant select on public\.v_promo_redemptions_by_code to service_role/);
  });

  it("shows counts per code, never who", () => {
    const view = migration.match(/create or replace view public\.v_promo_redemptions_by_code[\s\S]*?group by code;/)?.[0] ?? "";
    expect(view).toMatch(/group by code/);
    const finalSelect = view.slice(view.indexOf("\nselect\n  code,"));
    expect(finalSelect).toMatch(/count\(\*\) as started/);
    expect(finalSelect).not.toMatch(/user_id/);
  });
});

describe("the migration", () => {
  it("only adds: nothing is dropped, deleted or altered", () => {
    const sql = migration.replace(/--[^\n]*/g, "").replace(/^\s*revoke[^;]*;/gim, "");
    expect(sql).not.toMatch(/\bdrop (table|view|column|function|policy)\b/i);
    expect(sql).not.toMatch(/\bdelete from\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    // The only alter is switching row level security on for the new table.
    expect(sql.match(/\balter table [^;]*;/gi)).toEqual(["alter table public.promo_redemptions enable row level security;"]);
  });

  it("is mirrored in schema.sql", () => {
    expect(schema).toContain(body(migration).replace(/\s*commit;\s*$/, "").trimEnd());
  });
});
