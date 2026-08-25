import { EXPERIENCES } from "@/db/seed-data";
import type { Experience } from "@/types/database";
import { distanceMiles } from "@/lib/utils/geo";
import type { ExperienceProvider, ExperienceQuery } from "./types";

// Deterministic UUIDs derived from slugs so the same experience always gets
// the same id across a dev session (stable links, saves, etc.).
function idForSlug(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${hex.slice(0, 8)}-mock-4a11-9bee-${hex.padEnd(12, "0").slice(0, 12)}`;
}

const CATALOG: Experience[] = EXPERIENCES.map((e) => ({
  ...e,
  id: idForSlug(e.slug),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

export class MockExperienceProvider implements ExperienceProvider {
  async list(query: ExperienceQuery): Promise<Experience[]> {
    let results = [...CATALOG];

    if (query.city) {
      const city = query.city.toLowerCase();
      results = results.filter((e) => e.city.toLowerCase().includes(city));
    }

    if (query.category) {
      results = results.filter((e) => e.category === query.category);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter((e) => query.tags!.some((t) => e.tags.includes(t as never)));
    }

    if (query.priceLevel && query.priceLevel.length > 0) {
      results = results.filter((e) => query.priceLevel!.includes(e.priceLevel));
    }

    if (query.indoorOutdoor && query.indoorOutdoor !== "either") {
      results = results.filter((e) => e.indoorOutdoor === query.indoorOutdoor);
    }

    if (query.socialMode && query.socialMode !== "either") {
      results = results.filter((e) => e.socialMode === query.socialMode || e.socialMode === "either");
    }

    if (query.hiddenGemsOnly) {
      results = results.filter((e) => e.isHiddenGem);
    }

    if (query.featuredOnly) {
      results = results.filter((e) => e.isFeatured);
    }

    if (query.search) {
      const s = query.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.title.toLowerCase().includes(s) ||
          e.shortDescription.toLowerCase().includes(s) ||
          e.tags.some((t) => t.toLowerCase().includes(s)) ||
          e.city.toLowerCase().includes(s)
      );
    }

    if (query.excludeIds && query.excludeIds.length > 0) {
      results = results.filter((e) => !query.excludeIds!.includes(e.id));
    }

    if (query.latitude != null && query.longitude != null) {
      const radius = query.radiusMiles ?? 10000;
      results = results
        .map((e) => ({
          e,
          d: distanceMiles(query.latitude!, query.longitude!, e.latitude, e.longitude),
        }))
        .filter(({ d }) => d <= radius)
        .sort((a, b) => a.d - b.d)
        .map(({ e }) => e);
    }

    return results.slice(0, query.limit ?? 100);
  }

  async getById(id: string): Promise<Experience | null> {
    return CATALOG.find((e) => e.id === id) ?? null;
  }

  async getBySlug(slug: string): Promise<Experience | null> {
    return CATALOG.find((e) => e.slug === slug) ?? null;
  }

  async getRelated(experienceId: string, limit = 4): Promise<Experience[]> {
    const source = CATALOG.find((e) => e.id === experienceId);
    if (!source) return [];
    return CATALOG.filter((e) => e.id !== experienceId)
      .map((e) => ({
        e,
        score:
          (e.category === source.category ? 2 : 0) +
          e.tags.filter((t) => source.tags.includes(t)).length +
          (e.city === source.city ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ e }) => e);
  }
}
