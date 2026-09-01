/**
 * Core domain types. These mirror the Postgres schema in db/schema.sql.
 * Keep them in sync manually — if the project grows, generate these with
 * `supabase gen types typescript` instead.
 */

export type UUID = string;
export type ISODateString = string;

export type InterestTag =
  | "outdoors"
  | "hiking"
  | "beaches"
  | "food"
  | "nightlife"
  | "music"
  | "concerts"
  | "art"
  | "history"
  | "sports"
  | "fitness"
  | "adventure"
  | "photography"
  | "luxury"
  | "nature"
  | "culture"
  | "technology"
  | "entrepreneurship"
  | "wellness"
  | "learning";

export type LifestyleGoal =
  | "travel_more"
  | "meet_people"
  | "get_outside"
  | "discover_my_city"
  | "try_new_things"
  | "become_more_adventurous"
  | "spend_less_time_online"
  | "create_memories"
  | "improve_social_life";

export interface PersonalitySliders {
  spontaneousVsPlanned: number; // 0 = planned, 100 = spontaneous
  quietVsSocial: number; // 0 = quiet, 100 = social
  adventurousVsComfortable: number; // 0 = comfortable, 100 = adventurous
  budgetVsLuxury: number; // 0 = budget, 100 = luxury
  familiarVsNovel: number; // 0 = familiar, 100 = novel
}

export type BudgetLevel = "free" | "low" | "medium" | "high" | "luxury";
export type SocialMode = "solo" | "group" | "either";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night" | "any";
export type IndoorOutdoor = "indoor" | "outdoor" | "either";

export interface UserPreferences {
  budgetLevel: BudgetLevel;
  travelFrequency: "rarely" | "sometimes" | "often" | "constantly";
  maxDistanceMiles: number;
  preferredDurationMinutes: number;
  indoorOutdoor: IndoorOutdoor;
  socialMode: SocialMode;
  timeOfDay: TimeOfDay;
}

export interface Profile {
  id: UUID;
  userId: UUID;
  firstName: string;
  lastName: string | null;
  ageRange: "18-20" | "21-24" | "25-27" | "28-30" | "31-35" | "36+" | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  avatarUrl: string | null;
  bio: string | null;
  interests: InterestTag[];
  lifestyleGoals: LifestyleGoal[];
  personality: PersonalitySliders;
  preferences: UserPreferences;
  onboardingCompleted: boolean;
  onboardingStep: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type ExperienceCategory =
  | "outdoor_adventure"
  | "food_drink"
  | "nightlife"
  | "arts_culture"
  | "wellness"
  | "sports_fitness"
  | "music_entertainment"
  | "history_learning"
  | "hidden_gem"
  | "day_trip"
  | "travel"
  | "social";

export interface Experience {
  id: UUID;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  category: ExperienceCategory;
  tags: InterestTag[];
  images: string[];
  city: string;
  region: string | null;
  country: string;
  address: string | null;
  latitude: number;
  longitude: number;
  priceLevel: BudgetLevel;
  priceEstimate: number | null;
  priceCurrency: string;
  durationMinutes: number | null;
  indoorOutdoor: IndoorOutdoor;
  socialMode: SocialMode;
  bestTimeOfDay: TimeOfDay;
  rating: number | null;
  reviewCount: number;
  isHiddenGem: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  externalBookingUrl: string | null;
  sourceProvider: "mock" | "google_places" | "manual" | "eventbrite";
  sourceId: string | null;
  requirements: string[];
  availability: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Review {
  id: UUID;
  experienceId: string; // real uuid (curated) or "g-<place_id>" (Google Places) — see schema.sql
  userId: UUID | null;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: ISODateString;
}

export interface SavedExperience {
  id: UUID;
  userId: UUID;
  experienceId: string; // real uuid (curated) or "g-<place_id>" (Google Places) — see schema.sql
  collection: string; // e.g. "Weekend", "NYC", "Bucket List"
  status: "saved" | "planned" | "completed";
  notes: string | null;
  createdAt: ISODateString;
}

export type UserEventType =
  | "viewed_experience"
  | "saved_experience"
  | "dismissed_experience"
  | "shared_experience"
  | "clicked_booking"
  | "booked_experience"
  | "attended_experience"
  | "searched_category"
  | "changed_preference"
  | "surprise_me_requested"
  | "surprise_me_feedback";

export interface UserEvent {
  id: UUID;
  userId: UUID;
  eventType: UserEventType;
  experienceId: string | null; // real uuid (curated) or "g-<place_id>" (Google Places) — see schema.sql
  metadata: Record<string, unknown>;
  createdAt: ISODateString;
}

export interface Recommendation {
  id: UUID;
  userId: UUID;
  experienceId: UUID;
  matchScore: number; // 0-100
  reasoning: string;
  estimatedCost: number | null;
  estimatedDurationMinutes: number | null;
  recommendedTime: ISODateString | null;
  confidence: number; // 0-1
  surfaceContext: "for_you" | "nearby" | "weekend" | "hidden_gem" | "surprise_me" | "because_you_like";
  createdAt: ISODateString;
}

export interface Itinerary {
  id: UUID;
  userId: UUID;
  title: string;
  type: "weekend" | "day_trip" | "travel" | "custom";
  startDate: ISODateString | null;
  endDate: ISODateString | null;
  estimatedCost: number | null;
  isPublic: boolean;
  shareSlug: string | null;
  // Set for AI Trip Planner itineraries (type "travel") — the geo anchor
  // used to fetch real swap alternatives for an item. Null for Weekend
  // Planner itineraries, which don't support swapping yet.
  destinationCity: string | null;
  destinationCountry: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ItineraryItem {
  id: UUID;
  itineraryId: UUID;
  experienceId: string | null; // real uuid (curated) or "g-<place_id>" (Google Places) — see schema.sql
  dayIndex: number;
  startTime: string; // "09:00"
  title: string;
  notes: string | null;
  estimatedCost: number | null;
  orderIndex: number;
  images: string[];
}

export interface Trip {
  id: UUID;
  userId: UUID;
  destinationCity: string;
  destinationCountry: string;
  startDate: ISODateString | null;
  endDate: ISODateString | null;
  status: "planning" | "upcoming" | "active" | "completed";
  coverImage: string | null;
  createdAt: ISODateString;
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "none";

export interface Subscription {
  id: UUID;
  userId: UUID;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: SubscriptionStatus;
  planId: "free" | "premium";
  currentPeriodEnd: ISODateString | null;
  cancelAtPeriodEnd: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Payment {
  id: UUID;
  userId: UUID;
  stripeInvoiceId: string | null;
  amount: number;
  currency: string;
  status: "paid" | "failed" | "pending" | "refunded";
  createdAt: ISODateString;
}

export interface SocialProfile {
  userId: UUID;
  displayName: string;
  handle: string;
  isPublic: boolean;
  experiencesCompleted: number;
  followerCount: number;
  followingCount: number;
}

export interface Follow {
  id: UUID;
  followerId: UUID;
  followingId: UUID;
  createdAt: ISODateString;
}

export interface Share {
  id: UUID;
  userId: UUID;
  entityType: "experience" | "itinerary" | "trip";
  entityId: UUID;
  channel: "link" | "twitter" | "instagram" | "sms" | "email" | "other";
  createdAt: ISODateString;
}
