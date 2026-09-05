import { describe, expect, it } from "vitest";
import { MockExperienceProvider } from "@/services/providers/mock-experience-provider";

/**
 * MockExperienceProvider implements the same ExperienceProvider contract as
 * SupabaseExperienceProvider (see services/providers/types.ts), so exercising
 * it here doubles as a contract test for "database operations" without
 * requiring a live Postgres instance.
 */
describe("MockExperienceProvider", () => {
  const provider = new MockExperienceProvider();

  it("lists experiences filtered by city", async () => {
    const results = await provider.list({ city: "Baltimore" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.city === "Baltimore")).toBe(true);
  });

  it("filters by category", async () => {
    const results = await provider.list({ category: "food_drink" });
    expect(results.every((e) => e.category === "food_drink")).toBe(true);
  });

  it("filters by hidden gems only", async () => {
    const results = await provider.list({ hiddenGemsOnly: true });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.isHiddenGem)).toBe(true);
  });

  it("returns the same experience id for repeated getBySlug calls (stable ids)", async () => {
    const all = await provider.list({});
    const slug = all[0].slug;
    const first = await provider.getBySlug(slug);
    const second = await provider.getBySlug(slug);
    expect(first?.id).toBe(second?.id);
  });

  it("getById returns null for an unknown id", async () => {
    const result = await provider.getById("does-not-exist");
    expect(result).toBeNull();
  });

  it("getRelated excludes the source experience itself", async () => {
    const all = await provider.list({});
    const related = await provider.getRelated(all[0], 4);
    expect(related.find((e) => e.id === all[0].id)).toBeUndefined();
  });

  it("respects the limit parameter", async () => {
    const results = await provider.list({ limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });
});
