import type { ExperienceCategory } from "@/types/database";

// Extracted out of db/seed-data.ts (2026-09-22) -- that file's real bulk is
// the fictional dev-only EXPERIENCES catalog, and this metadata was the one
// thing in it two client components (discover-filters.tsx,
// experience-manager.tsx) actually needed. Importing the whole seed-data
// module just for this pulled the entire mock catalog into the client
// bundle for no reason; this file has none of that weight.
//
// Also the single source of truth for category display labels --
// lib/utils/format.ts's formatCategoryLabel() reads from CATEGORY_LABELS
// below instead of algorithmically title-casing the enum key, which used
// to produce "Sports Fitness"/"Food Drink" (no ampersand) on experience
// cards while this array's own "Sports & Fitness"/"Food & Drink" showed on
// filter pills -- two different labels for the same category depending on
// which screen you were looking at.
export const CATEGORIES: { id: ExperienceCategory; label: string; icon: string; sortOrder: number }[] = [
  { id: "outdoor_adventure", label: "Outdoor & Adventure", icon: "mountain", sortOrder: 1 },
  { id: "food_drink", label: "Food & Drink", icon: "utensils", sortOrder: 2 },
  { id: "nightlife", label: "Nightlife", icon: "moon", sortOrder: 3 },
  { id: "arts_culture", label: "Arts & Culture", icon: "palette", sortOrder: 4 },
  { id: "wellness", label: "Wellness", icon: "heart", sortOrder: 5 },
  // Renamed from "Sports & Fitness" (2026-09-22, explicit user request) --
  // paired with narrowing what actually populates this category, see
  // google-places-experience-provider.ts's CATEGORY_TYPE_PRIORITY comment.
  // Generic gyms now resolve to "wellness" instead; this category is
  // reserved for places that are genuinely about playing a specific sport.
  { id: "sports_fitness", label: "Sports", icon: "dumbbell", sortOrder: 6 },
  { id: "music_entertainment", label: "Music & Entertainment", icon: "music", sortOrder: 7 },
  { id: "history_learning", label: "History & Learning", icon: "landmark", sortOrder: 8 },
  { id: "hidden_gem", label: "Hidden Gems", icon: "gem", sortOrder: 9 },
  { id: "day_trip", label: "Day Trips", icon: "car", sortOrder: 10 },
  { id: "travel", label: "Travel", icon: "plane", sortOrder: 11 },
  { id: "social", label: "Social", icon: "users", sortOrder: 12 },
];

export const CATEGORY_LABELS: Record<ExperienceCategory, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label])
) as Record<ExperienceCategory, string>;
