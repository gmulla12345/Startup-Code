import type { InterestTag, LifestyleGoal } from "@/types/database";

export const INTERESTS: { value: InterestTag; label: string; emoji: string }[] = [
  { value: "outdoors", label: "Outdoors", emoji: "🌲" },
  { value: "hiking", label: "Hiking", emoji: "🥾" },
  { value: "beaches", label: "Beaches", emoji: "🏖️" },
  { value: "food", label: "Food", emoji: "🍜" },
  { value: "nightlife", label: "Nightlife", emoji: "🌃" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "concerts", label: "Concerts", emoji: "🎤" },
  { value: "art", label: "Art", emoji: "🎨" },
  { value: "history", label: "History", emoji: "🏛️" },
  { value: "sports", label: "Sports", emoji: "⚽" },
  { value: "fitness", label: "Fitness", emoji: "💪" },
  { value: "adventure", label: "Adventure", emoji: "🧗" },
  { value: "photography", label: "Photography", emoji: "📷" },
  { value: "luxury", label: "Luxury", emoji: "✨" },
  { value: "nature", label: "Nature", emoji: "🍃" },
  { value: "culture", label: "Culture", emoji: "🎭" },
  { value: "technology", label: "Technology", emoji: "💻" },
  { value: "entrepreneurship", label: "Entrepreneurship", emoji: "🚀" },
  { value: "wellness", label: "Wellness", emoji: "🧘" },
  { value: "learning", label: "Learning", emoji: "📚" },
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

export const PERSONALITY_SLIDERS: {
  key: "spontaneousVsPlanned" | "quietVsSocial" | "adventurousVsComfortable" | "budgetVsLuxury" | "familiarVsNovel";
  left: string;
  right: string;
}[] = [
  { key: "spontaneousVsPlanned", left: "Spontaneous", right: "Planned" },
  { key: "quietVsSocial", left: "Quiet", right: "Social" },
  { key: "adventurousVsComfortable", left: "Adventurous", right: "Comfortable" },
  { key: "budgetVsLuxury", left: "Budget-conscious", right: "Luxury" },
  { key: "familiarVsNovel", left: "Familiar", right: "Novel" },
];
