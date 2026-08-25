import type { Experience } from "@/types/database";
import type { ExperienceProvider, ExperienceQuery } from "./types";
import { MockExperienceProvider } from "./mock-experience-provider";

/**
 * Wraps a primary provider (typically Supabase-backed) and falls back to
 * the in-memory mock catalog if it throws — e.g. Supabase credentials are
 * set but schema.sql hasn't been run yet, or the network call fails. This
 * is what makes "the app should still run without configured services" true
 * even when configuration is present but incomplete.
 */
export class ResilientExperienceProvider implements ExperienceProvider {
  private fallback = new MockExperienceProvider();

  constructor(private primary: ExperienceProvider) {}

  async list(query: ExperienceQuery): Promise<Experience[]> {
    try {
      return await this.primary.list(query);
    } catch (err) {
      console.error("[providers] primary experience provider failed, using mock fallback:", err);
      return this.fallback.list(query);
    }
  }

  async getById(id: string): Promise<Experience | null> {
    try {
      return await this.primary.getById(id);
    } catch (err) {
      console.error("[providers] primary experience provider failed, using mock fallback:", err);
      return this.fallback.getById(id);
    }
  }

  async getBySlug(slug: string): Promise<Experience | null> {
    try {
      return await this.primary.getBySlug(slug);
    } catch (err) {
      console.error("[providers] primary experience provider failed, using mock fallback:", err);
      return this.fallback.getBySlug(slug);
    }
  }

  async getRelated(experienceId: string, limit = 4): Promise<Experience[]> {
    try {
      return await this.primary.getRelated(experienceId, limit);
    } catch (err) {
      console.error("[providers] primary experience provider failed, using mock fallback:", err);
      return this.fallback.getRelated(experienceId, limit);
    }
  }
}
