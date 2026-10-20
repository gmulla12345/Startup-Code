import { BUDGET_LEVELS } from "@/lib/config/taxonomy";
import type { BudgetLevel, InterestTag } from "@/types/database";

/**
 * The two questions a visitor answers before their first list. Each answer is a plain
 * choice that maps onto what the signed-in app already understands (interests and a
 * budget), so the same scoring runs on it. Shared by the page and the server.
 */

export const OUTINGS = [
  // COPY: the six kinds of outing a visitor can choose between
  { id: "meal", label: "A good meal", interests: ["food"] },
  { id: "night", label: "Music or a night out", interests: ["music", "nightlife"] },
  { id: "outdoors", label: "Time outdoors", interests: ["outdoors", "nature"] },
  { id: "culture", label: "Art and history", interests: ["art", "history", "culture"] },
  { id: "active", label: "Something active", interests: ["fitness", "sports", "adventure"] },
  { id: "calm", label: "Somewhere calm", interests: ["wellness", "nature"] },
] as const satisfies readonly { id: string; label: string; interests: readonly InterestTag[] }[];

export type OutingId = (typeof OUTINGS)[number]["id"];

/** The budgets offered: the same real dollar ranges onboarding uses, without the top one. */
export const BUDGETS: { id: BudgetLevel; label: string }[] = BUDGET_LEVELS.filter((b) => b.value !== "luxury").map((b) => ({
  id: b.value,
  label: b.label,
}));

export type BudgetId = (typeof BUDGETS)[number]["id"];

export function isOutingId(value: unknown): value is OutingId {
  return typeof value === "string" && OUTINGS.some((o) => o.id === value);
}

export function isBudgetId(value: unknown): value is BudgetId {
  return typeof value === "string" && BUDGETS.some((b) => b.id === value);
}

export function outingInterests(id: OutingId): InterestTag[] {
  return [...(OUTINGS.find((o) => o.id === id)?.interests ?? [])];
}
