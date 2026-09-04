import type { BudgetLevel, InterestTag, LifestyleGoal } from "@/types/database";

export const INTERESTS: { value: InterestTag; label: string }[] = [
  { value: "outdoors", label: "Outdoors" },
  { value: "hiking", label: "Hiking" },
  { value: "beaches", label: "Beaches" },
  { value: "food", label: "Food" },
  { value: "nightlife", label: "Nightlife" },
  { value: "music", label: "Music" },
  { value: "concerts", label: "Concerts" },
  { value: "art", label: "Art" },
  { value: "history", label: "History" },
  { value: "sports", label: "Sports" },
  { value: "fitness", label: "Fitness" },
  { value: "adventure", label: "Adventure" },
  { value: "photography", label: "Photography" },
  { value: "luxury", label: "Luxury" },
  { value: "nature", label: "Nature" },
  { value: "culture", label: "Culture" },
  { value: "technology", label: "Technology" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "wellness", label: "Wellness" },
  { value: "learning", label: "Learning" },
];

export const LIFESTYLE_GOALS: { value: LifestyleGoal; label: string }[] = [
  { value: "travel_more", label: "Travel more" },
  { value: "meet_people", label: "Meet people" },
  { value: "get_outside", label: "Get outside" },
  { value: "discover_my_city", label: "Discover my city" },
  { value: "try_new_things", label: "Try new things" },
  { value: "become_more_adventurous", label: "Become more adventurous" },
  { value: "spend_less_time_online", label: "Spend less time online" },
  { value: "create_memories", label: "Create memories" },
  { value: "improve_social_life", label: "Improve my social life" },
];

export const AGE_RANGES = ["18-20", "21-24", "25-27", "28-30", "31-35", "36+"] as const;

// Real dollar ranges instead of bare $/$$/$$$/$$$$ symbols, which tested
// unclear — this is "typical cost of a single experience," a different
// scale than the Trip Planner's per-day budget (src/ai/trip-plan.ts).
export const BUDGET_LEVELS: { value: BudgetLevel; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "low", label: "Under $25" },
  { value: "medium", label: "$25–75" },
  { value: "high", label: "$75–150" },
  { value: "luxury", label: "$150+" },
];

export const PERSONALITY_SLIDERS: {
  key: "spontaneousVsPlanned" | "quietVsSocial" | "adventurousVsComfortable" | "budgetVsLuxury" | "familiarVsNovel";
  left: string;
  right: string;
}[] = [
  { key: "spontaneousVsPlanned", left: "Spontaneous", right: "Planned" },
  { key: "quietVsSocial", left: "Quiet", right: "Social" },
  { key: "adventurousVsComfortable", left: "Adventurous", right: "Comfortable" },
  { key: "budgetVsLuxury", left: "Budget-conscious", right: "Luxury" },
  { key: "familiarVsNovel", left: "Tried & true", right: "Hidden gems" },
];
