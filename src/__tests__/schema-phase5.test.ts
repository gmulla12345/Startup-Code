import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guards for Phase 5's one database change, read from the SQL itself (and rehearsed against the real database in
// a rolled-back transaction before it is applied): the two dates of a paused month on the subscriptions table.

const root = join(__dirname, "../db");
const schema = readFileSync(join(root, "schema.sql"), "utf-8");
const migration = readFileSync(join(root, "migrations/20261023_01_subscription_pause.sql"), "utf-8");
const code = migration.replace(/--[^\n]*/g, "");
const body = migration.slice(migration.indexOf("alter table public.subscriptions add column if not exists paused_from"), migration.lastIndexOf("commit;")).trimEnd();

describe("the paused month, in the database", () => {
  it("adds two optional dates and nothing else to the subscriptions table", () => {
    expect(code).toMatch(/add column if not exists paused_from timestamptz;/);
    expect(code).toMatch(/add column if not exists paused_until timestamptz;/);
    expect([...code.matchAll(/add column/g)]).toHaveLength(2);
    expect(code).not.toMatch(/add column[^;]*not null/i); // optional: every row already there has no pause
  });

  it("keeps the two dates together: both or neither, and the month ends after it begins", () => {
    expect(code).toMatch(/\(paused_from is null and paused_until is null\)/);
    expect(code).toMatch(/paused_from is not null and paused_until is not null and paused_until > paused_from/);
  });

  it("adds its check only once, so applying the migration twice is harmless", () => {
    expect(code).toMatch(/if not exists \(select 1 from pg_constraint where conname = 'subscriptions_pause_window'\)/);
  });

  it("changes no row and removes nothing", () => {
    expect(code).not.toMatch(/\b(update|delete from|truncate|insert into)\b/i);
    expect(code).not.toMatch(/\bdrop (table|column|function|policy)\b/i);
  });

  it("leaves who may read and write the table exactly as it was: no policy, no grant", () => {
    expect(code).not.toMatch(/create policy/i);
    expect(code).not.toMatch(/\bgrant\b/i);
    expect(code).not.toMatch(/disable row level security/i);
  });

  it("runs as one transaction", () => {
    expect(code.trim().startsWith("begin;")).toBe(true);
    expect(code.trim().endsWith("commit;")).toBe(true);
  });

  it("is mirrored in schema.sql", () => {
    expect(schema).toContain(body);
  });
});
