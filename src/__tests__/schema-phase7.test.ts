import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guards for Phase 7's two database changes, read from the SQL itself (and rehearsed against the real database in a
// rolled-back transaction before they are applied): the nearby save counts, and lists a person makes themselves.

const root = join(__dirname, "../db");
const schema = readFileSync(join(root, "schema.sql"), "utf-8");
const counts = readFileSync(join(root, "migrations/20261025_01_save_counts.sql"), "utf-8");
const lists = readFileSync(join(root, "migrations/20261025_02_user_lists.sql"), "utf-8");
const code = (sql: string) => sql.replace(/--[^\n]*/g, "");
const bodyOf = (sql: string, from: string) => sql.slice(sql.indexOf(from), sql.lastIndexOf("commit;")).trimEnd();

describe("the nearby save counts", () => {
  const fn = code(counts).match(/create or replace function public\.place_save_counts[\s\S]*?\n\$\$;/)?.[0] ?? "";

  it("never answers with a number below three, whatever is asked", () => {
    expect(fn).toMatch(/if p_min is null or p_min < 3 then\s+raise exception/);
    expect(fn).toMatch(/having count\(distinct s\.user_id\) >= p_min/);
  });

  it("counts different people once, saves only (not a completion), in the window, never the viewer's own", () => {
    expect(fn).toMatch(/count\(distinct s\.user_id\)/);
    expect(fn).toMatch(/s\.status = 'saved'/);
    expect(fn).toMatch(/s\.created_at >= p_since/);
    expect(fn).toMatch(/s\.user_id is distinct from p_viewer/);
  });

  it("counts only verified students whose profile has a place, within the radius", () => {
    expect(fn).toMatch(/p\.edu_verified_at is not null/);
    expect(fn).toMatch(/p\.latitude is not null/);
    expect(fn).toMatch(/p\.longitude is not null/);
    expect(fn).toMatch(/3958\.8 \* 2 \* asin\(sqrt\(/);
    expect(fn).toMatch(/<= p_radius_miles/);
  });

  it("returns a place and a number and nothing about who", () => {
    expect(fn).toMatch(/returns table \(out_experience_id text, out_savers integer\)/);
    expect(fn).not.toMatch(/select s\.user_id|out_user|p\.first_name|email/i);
  });

  it("asks about at most 200 places, and gives nothing for a viewer with no location", () => {
    expect(fn).toMatch(/array_length\(p_experience_ids, 1\) > 200/);
    expect(fn).toMatch(/p_lat is null or p_lng is null/);
  });

  it("is callable by the server only", () => {
    expect(code(counts)).toMatch(/revoke all on function public\.place_save_counts\([^)]*\) from public, anon, authenticated;/);
    expect(code(counts)).toMatch(/grant execute on function public\.place_save_counts\([^)]*\) to service_role;/);
    expect(fn).toMatch(/security definer/);
    expect(fn).toMatch(/set search_path = public/);
  });

  it("is additive: one function and one index, nothing changed or removed", () => {
    expect(code(counts)).toMatch(/create index if not exists idx_saved_experience_recent on public\.saved_experiences \(experience_id, created_at desc\)/);
    expect(code(counts)).not.toMatch(/\b(update public\.|delete from|truncate|insert into)/i);
    expect(code(counts)).not.toMatch(/\bdrop (table|column)\b/i);
  });

  it("is mirrored in schema.sql", () => {
    expect(schema).toContain(bodyOf(counts, "create index if not exists idx_saved_experience_recent"));
  });
});

describe("lists a person makes themselves", () => {
  const fn = code(lists).match(/create or replace function public\.save_user_list[\s\S]*?\n\$\$;/)?.[0] ?? "";

  it("adds two columns whose defaults keep every list that exists working as it did: public, with no name", () => {
    expect(code(lists)).toMatch(/add column if not exists is_public boolean not null default true/);
    expect(code(lists)).toMatch(/add column if not exists show_name boolean not null default false/);
  });

  it("makes a list private unless the call says otherwise, and shows a name only on a public one", () => {
    expect(fn).toMatch(/coalesce\(p_public, false\)/);
    expect(fn).toMatch(/coalesce\(p_public, false\) and coalesce\(p_show_name, false\)/);
  });

  it("holds three to ten distinct places, each once, and a limited number of lists", () => {
    expect(fn).toMatch(/v_places < 3 or v_places > 10/);
    expect(fn).toMatch(/count\(distinct x\) from unnest\(p_place_ids\) as x\) <> v_places/);
    expect(fn).toMatch(/v_count >= p_max_lists/);
    expect(fn).toMatch(/where user_id = p_user and template is null/);
  });

  it("changes only the owner's own list, and says so plainly when it is not theirs", () => {
    expect(fn).toMatch(/where l\.id = p_id and l\.user_id = p_user and l\.template is null\s+for update/);
    expect(fn).toMatch(/raise exception 'list_not_found'/);
  });

  it("gives a list a new address whenever it goes from private to public, so an old link never opens it again", () => {
    expect(fn).toMatch(/case when coalesce\(p_public, false\) and not v_was_public then p_token else v_old end/);
    expect(fn).toMatch(/returns table \(out_id uuid, out_token text, out_old_token text, out_created boolean\)/);
  });

  it("is callable by the server only, and leaves the tables as closed as they were", () => {
    expect(code(lists)).toMatch(/revoke all on function public\.save_user_list\([^)]*\) from public, anon, authenticated;/);
    expect(code(lists)).toMatch(/grant execute on function public\.save_user_list\([^)]*\) to service_role;/);
    expect(code(lists)).not.toMatch(/create policy/i);
    expect(code(lists)).not.toMatch(/\bgrant (select|insert|update|delete|all)\b/i);
    expect(fn).toMatch(/security definer/);
  });

  it("is additive: applying it changes and removes no row (the function's own updates run only when it is called)", () => {
    const outsideTheFunction = code(lists).replace(fn, "");
    expect(outsideTheFunction).not.toMatch(/\b(update public\.|delete from|truncate|insert into)/i);
    expect(code(lists)).not.toMatch(/\bdrop (table|column)\b/i);
  });

  it("is mirrored in schema.sql", () => {
    expect(schema).toContain(bodyOf(lists, "alter table public.lists add column if not exists is_public"));
  });
});
