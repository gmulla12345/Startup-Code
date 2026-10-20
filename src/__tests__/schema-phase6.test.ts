import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guards for Phase 6's one database change, read from the SQL itself (and rehearsed against the real database in a
// rolled-back transaction before it is applied): the table the owner fills in to mark a place as a local pick.

const root = join(__dirname, "../db");
const schema = readFileSync(join(root, "schema.sql"), "utf-8");
const migration = readFileSync(join(root, "migrations/20261024_01_local_picks.sql"), "utf-8");
const code = migration.replace(/--[^\n]*/g, "");
const body = migration.slice(migration.indexOf("create table if not exists public.local_picks"), migration.lastIndexOf("commit;")).trimEnd();

describe("the local picks table", () => {
  it("holds a Google place id and a yes or no, and nothing else from Google", () => {
    const table = code.match(/create table if not exists public\.local_picks \(([\s\S]*?)\n\);/)?.[1] ?? "";
    const columns = [...table.matchAll(/^ {2}([a-z_]+) /gm)].map((m) => m[1]);
    expect(columns).toEqual(["place_id", "local_pick", "created_at", "updated_at"]);
    expect(table).toMatch(/place_id text primary key check \(char_length\(place_id\) between 10 and 300 and place_id ~ '\^\[A-Za-z0-9_-\]\+\$'\)/);
  });

  it("marks a place by default, so adding a row is enough, and the owner can switch it off without deleting", () => {
    expect(code).toMatch(/local_pick boolean not null default true/);
  });

  it("is closed to every browser key: row level security on, nothing granted, no policy", () => {
    expect(code).toMatch(/alter table public\.local_picks enable row level security;/);
    expect(code).toMatch(/revoke all on public\.local_picks from anon, authenticated;/);
    expect(code).not.toMatch(/create policy/i);
    expect(code).not.toMatch(/\bgrant\b/i);
  });

  it("keeps its updated_at current, and is additive: it changes and removes nothing", () => {
    expect(code).toMatch(/create trigger trg_local_picks_updated_at before update on public\.local_picks[\s\S]*?execute function public\.set_updated_at\(\)/);
    // (the trigger says "before update on"; that is not a statement that changes a row)
    expect(code).not.toMatch(/\b(update public\.|delete from|truncate|insert into)/i);
    expect(code).not.toMatch(/\bdrop (table|column|function|policy)\b/i);
    expect(code.trim().startsWith("begin;") && code.trim().endsWith("commit;")).toBe(true);
  });

  it("tells the owner how to mark a place and how to take the badge off", () => {
    expect(migration).toMatch(/insert into public\.local_picks \(place_id\) values \('ChIJ\.\.\.'\)[\s\S]*?on conflict \(place_id\) do update set local_pick = true;/);
    expect(migration).toMatch(/update public\.local_picks set local_pick = false where place_id = 'ChIJ\.\.\.';/);
  });

  it("is mirrored in schema.sql", () => {
    expect(schema).toContain(body);
  });
});
