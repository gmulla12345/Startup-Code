import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guards for the lists migration, read from the SQL itself (and rehearsed against the
// real database in a rolled-back transaction before it is applied).

const root = join(__dirname, "../db");
const schema = readFileSync(join(root, "schema.sql"), "utf-8");
const migration = readFileSync(join(root, "migrations/20261021_01_lists.sql"), "utf-8");

const code = (sql: string) => sql.replace(/--[^\n]*/g, "");
const tableOf = (sql: string, name: string) => sql.match(new RegExp(`create table if not exists public\\.${name} \\(([\\s\\S]*?)\\n\\);`))?.[1] ?? "";
const columns = (body: string) => [...body.matchAll(/^ {2}([a-z_]+) /gm)].map((m) => m[1]).filter((c) => !["primary", "unique", "constraint"].includes(c));

describe("the lists tables", () => {
  it("are closed to every browser key, with no policy and no grant that opens them", () => {
    for (const t of ["lists", "list_places"]) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${t} enable row level security`));
      expect(migration).toMatch(new RegExp(`revoke all on public\\.${t} from anon, authenticated`));
      expect(code(migration)).not.toMatch(new RegExp(`create policy[^;]*${t}`, "i"));
      expect(code(migration)).not.toMatch(new RegExp(`grant [^;]*on public\\.${t}`, "i"));
    }
  });

  it("hold an unguessable token: unique, and only in the exact 22-character shape", () => {
    expect(tableOf(migration, "lists")).toMatch(/token text not null unique check \(token ~ '\^\[A-Za-z0-9_-\]\{22\}\$'\)/);
  });

  it("are removed with the account, and a list's places with the list", () => {
    expect(tableOf(migration, "lists")).toMatch(/user_id uuid not null references auth\.users\(id\) on delete cascade/);
    expect(tableOf(migration, "list_places")).toMatch(/list_id uuid not null references public\.lists\(id\) on delete cascade/);
  });

  it("store the Google place id and nothing else from Google, and nothing about the person but the account", () => {
    expect(columns(tableOf(migration, "lists"))).toEqual(["id", "token", "user_id", "template", "title", "blurb", "created_at", "updated_at"]);
    expect(columns(tableOf(migration, "list_places"))).toEqual(["list_id", "position", "place_id", "why"]);
  });

  it("only accept a place id of the shape Google uses, and a list of at most ten places in order", () => {
    const places = tableOf(migration, "list_places");
    expect(places).toMatch(/char_length\(place_id\) between 10 and 300 and place_id ~ '\^\[A-Za-z0-9_-\]\+\$'/);
    expect(places).toMatch(/position integer not null check \(position between 1 and 10\)/);
    expect(places).toMatch(/primary key \(list_id, position\)/);
    expect(places).toMatch(/unique \(list_id, place_id\)/);
  });

  it("keep our words short, and leave the template a plain name so a new list rule needs no migration", () => {
    const lists = tableOf(migration, "lists");
    expect(lists).toMatch(/title text not null check \(char_length\(title\) between 1 and 80\)/);
    expect(lists).toMatch(/blurb text check \(blurb is null or char_length\(blurb\) between 1 and 160\)/);
    expect(lists).toMatch(/template text check \(template is null or template ~ '\^\[a-z0-9-\]\{1,40\}\$'\)/);
  });

  it("allow one live list per person per template, so sharing again updates rather than multiplies", () => {
    expect(migration).toMatch(/unique index if not exists uniq_lists_user_template on public\.lists \(user_id, template\) where template is not null/);
  });

  it("use no regular-expression repeat count above 255, which Postgres only refuses when a row is checked", () => {
    for (const [, upper] of migration.matchAll(/\{(?:\d+,)?(\d+)\}/g)) expect(Number(upper)).toBeLessThanOrEqual(255);
  });
});

describe("save_shared_list()", () => {
  const fn = migration.match(/create or replace function public\.save_shared_list[\s\S]*?\n\$\$;/)?.[0] ?? "";

  it("is callable by the server only", () => {
    expect(migration).toMatch(/revoke all on function public\.save_shared_list\(uuid, text, text, text, text, text\[\], integer\) from public, anon, authenticated/);
    expect(migration).toMatch(/grant execute on function public\.save_shared_list\(uuid, text, text, text, text, text\[\], integer\) to service_role/);
    expect(fn).toMatch(/security definer/);
    expect(fn).toMatch(/set search_path = public/);
  });

  it("refuses fewer than three or more than ten places, a place twice, and a person's list beyond the limit", () => {
    expect(fn).toMatch(/v_places < 3 or v_places > 10/);
    expect(fn).toMatch(/count\(distinct x\) from unnest\(p_place_ids\)/);
    expect(fn).toMatch(/v_count >= p_max_lists/);
    expect(fn).toMatch(/list_limit/);
  });

  it("replaces the places of a list the person already has instead of making a second list", () => {
    expect(fn).toMatch(/where l\.user_id = p_user and l\.template = p_template\s+for update/);
    expect(fn).toMatch(/delete from public\.list_places where list_id = v_id/);
  });

  it("does not use the names of the columns it returns for its own results (they would be ambiguous)", () => {
    expect(fn).toMatch(/returns table \(out_token text, out_created boolean\)/);
  });
});

describe("the migration", () => {
  it("is additive: it creates things and drops or deletes nothing", () => {
    const sql = code(migration);
    expect(sql).not.toMatch(/\bdrop (table|column|index|function)\b/i);
    expect(sql).not.toMatch(/\bdelete from public\.(lists|profiles|saved|itineraries)/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
  });

  it("is mirrored in schema.sql", () => {
    const body = migration.slice(migration.indexOf("create table if not exists public.lists"), migration.lastIndexOf("commit;")).trimEnd();
    expect(schema).toContain(body);
  });
});
