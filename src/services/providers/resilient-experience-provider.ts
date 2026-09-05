import type { Experience } from "@/types/database";
import type { ExperienceProvider, ExperienceQuery } from "./types";

/**
 * Wraps a primary provider (typically Supabase-backed) and degrades to
 * empty results if it throws, instead of crashing the page.
 *
 * This used to fall back to the in-memory fictional mock catalog on any
 * error. That was a real bug, not just a defensive nicety: a Postgres type
 * error (non-uuid Google Places ids leaking into a uuid `.not("id","in",...)`
 * filter — fixed in supabase-experience-provider.ts) was silently degrading
 * production to fabricated listings on every request that included a
 * Google-sourced excludeId, which by 2026-08-31 is nearly every request. See
 * CLAUDE.md, "Production catalog is Google Places-only" — fictional content
 * must never reach real users, including on an error path. Returning empty
 * (worse UX during a real outage, but never dishonest) is the only fallback
 * that can't reintroduce that bug.
 */
export class ResilientExperienceProvider implements ExperienceProvider {
  constructor(private primary: ExperienceProvider) {}

  async list(query: ExperienceQuery): Promise<Experience[]> {
    try {
      return await this.primary.list(query);
    } catch (err) {
      console.error("[providers] primary experience provider failed:", err);
      return [];
    }
  }

  async getById(id: string): Promise<Experience | null> {
    try {
      return await this.primary.getById(id);
    } catch (err) {
      console.error("[providers] primary experience provider failed:", err);
      return null;
    }
  }

  async getBySlug(slug: string): Promise<Experience | null> {
    try {
      return await this.primary.getBySlug(slug);
    } catch (err) {
      console.error("[providers] primary experience provider failed:", err);
      return null;
    }
  }

  async getRelated(source: Experience, limit = 4): Promise<Experience[]> {
    try {
      return await this.primary.getRelated(source, limit);
    } catch (err) {
      console.error("[providers] primary experience provider failed:", err);
      return [];
    }
  }
}
