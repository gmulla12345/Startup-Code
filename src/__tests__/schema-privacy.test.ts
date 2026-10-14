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

// ---------------------------------------------------------------------------
// Phase 1: measurement
// ---------------------------------------------------------------------------
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

const analyticsMigration = readFileSync(join(root, "migrations/20261015_01_analytics_events.sql"), "utf-8");

describe("analytics_events stays private and in sync with the code", () => {
  it("only allows the events the code defines, and the code defines exactly the database's list", () => {
    for (const sql of [schema, analyticsMigration]) {
      const list = sql.match(/event text not null check \(event in \(([\s\S]*?)\)\)/)?.[1] ?? "";
      const inDatabase = [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
      expect(inDatabase.sort()).toEqual([...ANALYTICS_EVENTS].sort());
    }
  });

  it("has row-level security on, no policies, and no access for the browser's keys", () => {
    expect(schema).toMatch(/alter table public\.analytics_events enable row level security/);
    expect(schema).not.toMatch(/create policy "[^"]*" on public\.analytics_events/i);
    expect(schema).toMatch(/revoke all on public\.analytics_events from anon, authenticated/);
  });

  it("keeps every analytics view away from the browser's keys and readable by the server", () => {
    const views = ["v_signups_by_src_code", "v_return_rates_by_src_code", "v_saves_per_user", "v_saves_by_src_code", "v_event_counts", "v_events_by_src_code"];
    for (const view of views) {
      expect(schema).toMatch(new RegExp(`create or replace view public\.${view} as`));
      expect(schema).toMatch(new RegExp(`revoke all on [^;]*public\.${view}[^;]* from anon, authenticated`));
      expect(schema).toMatch(new RegExp(`grant select on [^;]*public\.${view}[^;]* to service_role`));
    }
  });

  it("stores attribution on the user record with the same token rules the application uses", () => {
    expect(schema).toMatch(/signup_src text/);
    expect(schema).toMatch(/signup_src ~ '\^\[a-z0-9\._-\]\{1,64\}\$'/);
    expect(schema).toMatch(/signup_code ~ '\^\[A-Z0-9\._-\]\{1,64\}\$'/);
  });

  it("can never block a signup: the event insert is wrapped in an exception handler", () => {
    const fn = schema.match(/create or replace function public\.handle_new_user\(\)[\s\S]*?\$\$ language plpgsql/i)?.[0] ?? "";
    expect(fn).toMatch(/insert into public\.analytics_events/);
    expect(fn).toMatch(/exception when others then/);
    expect(fn.indexOf("insert into public.profiles")).toBeLessThan(fn.indexOf("exception when others"));
  });

  it("restricts the attribution patch function to the server and to brand-new accounts", () => {
    expect(schema).toMatch(/revoke all on function public\.apply_signup_attribution\(uuid, text, text\) from public, anon, authenticated/);
    expect(schema).toMatch(/grant execute on function public\.apply_signup_attribution\(uuid, text, text\) to service_role/);
    expect(schema).toMatch(/created_at > now\(\) - interval '30 minutes'/);
  });

  it("does not delete anything", () => {
    const sql = analyticsMigration.replace(/--[^\n]*/g, "");
    expect(sql).not.toMatch(/\bdrop table\b/i);
    expect(sql).not.toMatch(/\bdelete from\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
  });
});
