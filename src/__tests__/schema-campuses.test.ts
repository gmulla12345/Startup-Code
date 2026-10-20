import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FALLBACK_CAMPUSES } from "@/lib/campus";

// Guards for Phase 2's database changes, read from the SQL itself. (The behaviour
// was also rehearsed against the real database in a rolled-back transaction:
// domain matching, the confirmation link, a Google account, failure isolation.)

const root = join(__dirname, "../db");
const schema = readFileSync(join(root, "schema.sql"), "utf-8");
const migration = readFileSync(join(root, "migrations/20261016_01_campuses_and_student_verification.sql"), "utf-8");
// The one school that migration seeds (the rest come from 20261018_01).
const firstSlug = migration.match(/insert into public\.campuses[\s\S]*?values \('([a-z-]+)'/i)![1];

function createPolicies(sql: string, name: string): string[] {
  return sql.match(new RegExp(`create policy "${name}"[^;]*;`, "gi")) ?? [];
}

describe("campuses and the waitlist", () => {
  it("lets anyone read active campuses and nobody but the server change them", () => {
    expect(schema).toMatch(/alter table public\.campuses enable row level security/);
    expect(createPolicies(schema, "public read active campuses")[0]).toMatch(/for select using \(active\)/);
    expect(schema).not.toMatch(/create policy "[^"]*" on public\.campuses for (insert|update|delete|all)/i);
    expect(schema).toMatch(/revoke insert, update, delete, truncate on public\.campuses from anon, authenticated/);
  });

  it("keeps the waitlist closed to every browser key", () => {
    expect(schema).toMatch(/alter table public\.campus_waitlist enable row level security/);
    expect(schema).not.toMatch(/create policy "[^"]*" on public\.campus_waitlist/i);
    expect(schema).toMatch(/revoke all on public\.campus_waitlist from anon, authenticated/);
    expect(schema).toMatch(/create unique index if not exists uniq_campus_waitlist_email/);
  });

  it("verifies a student only through the server-side function, and never lets a browser call it", () => {
    expect(schema).toMatch(/revoke all on function public\.apply_student_verification\(uuid, text\) from public, anon, authenticated/);
    expect(schema).toMatch(/grant execute on function public\.apply_student_verification\(uuid, text\) to service_role/);
  });

  it("matches a school by its exact domain or a subdomain, never by a lookalike", () => {
    const fn = schema.match(/create or replace function public\.campus_for_email[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toMatch(/= lower\(d\)/);
    expect(fn).toMatch(/like '%\.' \|\| lower\(d\)/);
  });

  it("verifies on the confirmation link, and at creation for an already-verified (Google) account", () => {
    expect(schema).toMatch(/create trigger on_auth_user_email_confirmed\s+after update of email_confirmed_at on auth\.users/);
    expect(schema).toMatch(/when \(old\.email_confirmed_at is null and new\.email_confirmed_at is not null\)/);
    const signup = schema.match(/create or replace function public\.handle_new_user\(\)[\s\S]*?\$\$ language plpgsql/i)?.[0] ?? "";
    expect(signup).toMatch(/perform public\.apply_student_verification/);
  });

  it("can never block a signup or a confirmation", () => {
    const confirmed = schema.match(/create or replace function public\.handle_user_email_confirmed[\s\S]*?\$\$ language plpgsql/i)?.[0] ?? "";
    expect(confirmed).toMatch(/exception when others then/);
    const signup = schema.match(/create or replace function public\.handle_new_user\(\)[\s\S]*?\$\$ language plpgsql/i)?.[0] ?? "";
    expect(signup.indexOf("insert into public.profiles")).toBeLessThan(signup.indexOf("exception when others"));
  });

  it("seeds the first school, and the application's fallback list has the same row", () => {
    const first = FALLBACK_CAMPUSES.find((c) => c.slug === firstSlug)!;
    expect(first, "the migration's school is in the fallback list").toBeDefined();
    expect(migration).toContain(`'${first.name}'`);
    expect(migration).toContain(`array['${first.emailDomains[0]}']`);
  });

  it("deletes nothing", () => {
    // A `revoke ... delete, truncate ...` line removes a permission; it is not a deletion.
    const sql = migration.replace(/--[^\n]*/g, "").replace(/^\s*revoke[^;]*;/gim, "");
    expect(sql).not.toMatch(/\bdrop table\b/i);
    expect(sql).not.toMatch(/\bdelete from\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
  });
});

describe("the seeded schools", () => {
  const seed = readFileSync(join(root, "migrations/20261018_01_seed_campuses.sql"), "utf-8");

  // ('slug', 'Name', 'Short', array['a.edu', 'b.edu'])
  const rowPattern = /^\s*\('([^']+)', '((?:[^']|'')+)', '((?:[^']|'')+)', array\[([^\]]+)\]\),?$/gm;
  const parse = (sql: string) =>
    [...sql.matchAll(rowPattern)].map(([, slug, name, shortName, domains]) => ({
      slug,
      name: name.replace(/''/g, "'"),
      shortName: shortName.replace(/''/g, "'"),
      emailDomains: [...domains.matchAll(/'([^']+)'/g)].map((m) => m[1]),
    }));
  const withoutFirst = FALLBACK_CAMPUSES.filter((c) => c.slug !== firstSlug);

  it("adds every other school in the application's list, identically, and nothing else", () => {
    expect(parse(seed)).toEqual(withoutFirst);
    expect(parse(seed)).toHaveLength(99);
  });

  it("is mirrored in schema.sql", () => {
    const insert = seed.match(/insert into public\.campuses \(slug, name, short_name, email_domains\)[\s\S]*?on conflict \(slug\) do nothing;/)![0];
    expect(schema).toContain(insert);
  });

  it("only adds rows, and can be run twice", () => {
    const sql = seed.replace(/--[^\n]*/g, "");
    expect(sql).toMatch(/on conflict \(slug\) do nothing/);
    expect(sql).not.toMatch(/\b(drop|delete|truncate|update|alter)\b/i);
  });
});
