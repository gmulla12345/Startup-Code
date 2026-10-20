import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guards for Phase 4's database changes, read from the SQL itself (and rehearsed against the real database in
// a rolled-back transaction before they are applied): the founding spots, and the dated house lists.

const root = join(__dirname, "../db");
const schema = readFileSync(join(root, "schema.sql"), "utf-8");
const founding = readFileSync(join(root, "migrations/20261022_01_founding_student_spots.sql"), "utf-8");
const dated = readFileSync(join(root, "migrations/20261022_02_dated_house_lists.sql"), "utf-8");

const code = (sql: string) => sql.replace(/--[^\n]*/g, "");
const tableOf = (sql: string, name: string) => sql.match(new RegExp(`create table if not exists public\\.${name} \\(([\\s\\S]*?)\\n\\);`))?.[1] ?? "";
const bodyOf = (sql: string, from: string) => sql.slice(sql.indexOf(from), sql.lastIndexOf("commit;")).trimEnd();

describe("the founding spots", () => {
  it("keeps the owner's settings and the reservations closed to every browser key, with no policy and no grant", () => {
    for (const t of ["app_config", "founding_reservations"]) {
      expect(founding).toMatch(new RegExp(`alter table public\\.${t} enable row level security`));
      expect(founding).toMatch(new RegExp(`revoke all on public\\.${t} from anon, authenticated`));
      expect(code(founding)).not.toMatch(new RegExp(`create policy[^;]*${t}`, "i"));
      expect(code(founding)).not.toMatch(new RegExp(`grant [^;]*on public\\.${t}`, "i"));
    }
  });

  it("stores a setting under a plain name, and a reservation as an account and a time and nothing else", () => {
    expect(tableOf(founding, "app_config")).toMatch(/key text primary key check \(key ~ '\^\[a-z0-9_\]\{1,64\}\$'\)/);
    const columns = [...tableOf(founding, "founding_reservations").matchAll(/^ {2}([a-z_]+) /gm)].map((m) => m[1]);
    expect(columns).toEqual(["user_id", "expires_at", "created_at"]);
  });

  it("removes a reservation with the account it belongs to", () => {
    expect(tableOf(founding, "founding_reservations")).toMatch(/user_id uuid primary key references auth\.users\(id\) on delete cascade/);
  });

  it("allows one reservation per person, so asking again refreshes it instead of taking a second spot", () => {
    expect(tableOf(founding, "founding_reservations")).toMatch(/user_id uuid primary key/);
    expect(founding).toMatch(/on conflict \(user_id\) do update set expires_at/);
  });

  it("counts and reserves in one step under a lock, so the last spot cannot be sold twice", () => {
    const fn = founding.match(/create or replace function public\.reserve_founding_slot[\s\S]*?\n\$\$;/)?.[0] ?? "";
    expect(fn).toMatch(/pg_advisory_xact_lock/);
    expect(fn.indexOf("pg_advisory_xact_lock")).toBeLessThan(fn.indexOf("into v_holders")); // the lock comes before the count
    expect(fn.indexOf("into v_holders")).toBeLessThan(fn.indexOf("insert into public.founding_reservations")); // and the count before the hold
    expect(fn).toMatch(/v_holders \+ v_reserved >= p_cap/);
  });

  it("counts a live subscription at the student price (active, trialing, past due) and an unexpired reservation, and not the person themselves", () => {
    const fn = founding.match(/create or replace function public\.reserve_founding_slot[\s\S]*?\n\$\$;/)?.[0] ?? "";
    expect(fn).toMatch(/s\.stripe_price_id = p_price_id and s\.status in \('active', 'trialing', 'past_due'\) and s\.user_id <> p_user/);
    expect(fn).toMatch(/r\.expires_at > now\(\) and r\.user_id <> p_user/);
  });

  it("refuses a limit below one and a reservation of no time or over a day", () => {
    expect(founding).toMatch(/p_cap is null or p_cap < 1/);
    expect(founding).toMatch(/p_minutes is null or p_minutes < 1 or p_minutes > 1440/);
  });

  it("is callable by the server only", () => {
    for (const sig of ["founding_counts\\(text\\)", "reserve_founding_slot\\(uuid, text, integer, integer\\)"]) {
      expect(founding).toMatch(new RegExp(`revoke all on function public\\.${sig} from public, anon, authenticated`));
      expect(founding).toMatch(new RegExp(`grant execute on function public\\.${sig} to service_role`));
    }
    expect([...founding.matchAll(/security definer/g)]).toHaveLength(2);
    expect([...founding.matchAll(/set search_path = public/g)]).toHaveLength(2);
  });

  it("is additive: it creates things and drops or deletes nothing outside its own rollback note", () => {
    const sql = code(founding);
    expect(sql).not.toMatch(/\bdrop (table|column|index|function)\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql.match(/\bdelete from\b[^;]*/gi)).toEqual(["delete from public.founding_reservations where expires_at <= now() - interval '1 day'"]);
  });

  it("is mirrored in schema.sql", () => {
    expect(schema).toContain(bodyOf(founding, "create table if not exists public.app_config"));
  });
});

describe("the dated house lists", () => {
  it("lets a list have no owner, and gives it two dates", () => {
    expect(code(dated)).toMatch(/alter table public\.lists alter column user_id drop not null/);
    expect(code(dated)).toMatch(/add column if not exists starts_on date/);
    expect(code(dated)).toMatch(/add column if not exists ends_on date/);
  });

  it("keeps the shapes straight: the last day not before the first, no template without an owner, no dates on a list made for a person", () => {
    expect(dated).toMatch(/check \(starts_on is null or ends_on is null or ends_on >= starts_on\)/);
    expect(dated).toMatch(/check \(user_id is not null or template is null\)/);
    expect(dated).toMatch(/check \(user_id is null or \(starts_on is null and ends_on is null\)\)/);
  });

  it("adds each check only once, so applying the migration twice is harmless", () => {
    for (const name of ["lists_window", "lists_house_shape", "lists_dates_house_only"]) {
      expect(dated).toMatch(new RegExp(`if not exists \\(select 1 from pg_constraint where conname = '${name}'\\)`));
    }
  });

  it("changes no row and drops nothing outside its own rollback note", () => {
    const sql = code(dated);
    expect(sql).not.toMatch(/\bdrop (table|column|function)\b/i);
    expect(sql).not.toMatch(/\b(update|delete from|truncate|insert into)\b/i);
  });

  it("leaves the lists tables as closed as they were: it adds no policy and no grant", () => {
    expect(code(dated)).not.toMatch(/create policy/i);
    expect(code(dated)).not.toMatch(/\bgrant\b/i);
  });

  it("is mirrored in schema.sql", () => {
    expect(schema).toContain(bodyOf(dated, "alter table public.lists alter column user_id drop not null;"));
  });
});
