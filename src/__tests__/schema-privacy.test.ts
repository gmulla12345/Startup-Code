import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Regression guard for Phase 0.1. `npm run migrate` re-applies schema.sql, so
// if schema.sql still said "anyone may read social_profiles", a routine
// migrate would silently re-open the exposure that the migration closed. These
// tests read the SQL itself.

const root = join(__dirname, "../db");
const schema = readFileSync(join(root, "schema.sql"), "utf-8");
const migration = readFileSync(join(root, "migrations/20261014_01_restrict_social_exposure.sql"), "utf-8");

/** Every statement that creates the named policy, up to its terminating semicolon. */
function createPolicies(sql: string, name: string): string[] {
  const matches = sql.match(new RegExp(`create policy "${name}"[^;]*;`, "gi"));
  return matches ?? [];
}

describe("social tables stay private", () => {
  it("schema.sql no longer lets anyone read social_profiles", () => {
    expect(createPolicies(schema, "public social profiles")).toHaveLength(0);
    const own = createPolicies(schema, "own social profile");
    expect(own).toHaveLength(1);
    expect(own[0]).toMatch(/auth\.uid\(\) = user_id/);
    expect(own[0]).not.toMatch(/is_public/);
  });

  it("schema.sql no longer makes the follow graph world-readable", () => {
    expect(createPolicies(schema, "read follows")).toHaveLength(0);
    const scoped = createPolicies(schema, "read own follows");
    expect(scoped).toHaveLength(1);
    expect(scoped[0]).toMatch(/follower_id/);
    expect(scoped[0]).toMatch(/following_id/);
    expect(scoped[0]).not.toMatch(/using \(true\)/i);
  });

  it("social_profiles defaults to private", () => {
    expect(schema).toMatch(/is_public boolean not null default false/);
    expect(schema).not.toMatch(/is_public boolean not null default true/);
  });

  it("the logged-out role is denied on all three social tables", () => {
    for (const table of ["social_profiles", "follows", "shares"]) {
      expect(schema).toMatch(new RegExp(`revoke all on public\\.${table} from anon`));
      expect(migration).toMatch(new RegExp(`revoke all on public\\.${table} from anon`));
    }
  });

  it("signup creates no social_profiles row", () => {
    const fn = schema.match(/create or replace function public\.handle_new_user\(\)[\s\S]*?\$\$ language plpgsql/i)?.[0] ?? "";
    expect(fn).toContain("insert into public.profiles");
    expect(fn).toContain("insert into public.subscriptions");
    expect(fn.replace(/--[^\n]*/g, "")).not.toMatch(/insert into public\.social_profiles/i);
  });

  it("the migration deletes nothing", () => {
    const sql = migration.replace(/--[^\n]*/g, "");
    expect(sql).not.toMatch(/\bdrop table\b/i);
    expect(sql).not.toMatch(/\bdelete from\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
  });
});

describe("the usage table is write-protected", () => {
  it("is service-role-write only, with owner-only reads", () => {
    expect(schema).toMatch(/alter table public\.api_usage_events enable row level security/);
    expect(createPolicies(schema, "read own usage")[0]).toMatch(/auth\.uid\(\) = user_id/);
    expect(schema).not.toMatch(/create policy "[^"]*" on public\.api_usage_events for (insert|update|delete|all)/i);
    expect(schema).toMatch(/revoke all on public\.api_usage_events from anon/);
    expect(schema).toMatch(/revoke insert, update, delete, truncate on public\.api_usage_events from authenticated/);
  });

  it("the limit lookup can only be called by the service role", () => {
    expect(schema).toMatch(/revoke all on function public\.usage_units_since\(uuid, timestamptz\) from public, anon, authenticated/);
    expect(schema).toMatch(/grant execute on function public\.usage_units_since\(uuid, timestamptz\) to service_role/);
  });
});
