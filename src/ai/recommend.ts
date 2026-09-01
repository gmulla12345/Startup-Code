import { callStructuredTool, isAIConfigured } from "./client";
import { recommendationBatchSchema } from "./schema";
import { brand } from "@/lib/config/brand";
import type { RecommendationContext, StructuredRecommendation } from "@/types/ai";
import type { ScoredExperience } from "@/services/recommendation/scoring";

const RECOMMEND_TOOL_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          experienceId: { type: "string" },
          matchScore: { type: "number" },
          reasoning: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["experienceId", "matchScore", "reasoning", "confidence"],
      },
    },
  },
  required: ["recommendations"],
} as const;

const SYSTEM_PROMPT = `You are the recommendation reasoning layer for ${brand.name}, a personalized real-world discovery app.
You will be given a user's profile and a shortlist of candidate experiences that have ALREADY been
filtered and scored by a deterministic system — your job is only to write a short, warm, specific
reason each one was picked, and to lightly refine the match score (0-100) and a confidence (0-1).

Rules:
- NEVER invent facts (price, address, availability, booking status). Only use what's given.
- NEVER recommend an experienceId that isn't in the candidate list.
- Reasoning must reference something specific about the user (an interest, a personality trait,
  their budget, or their recent behavior) — never generic filler like "you'll love this".
- Keep each reasoning under 30 words.
- Return one entry per candidate provided, in the same or better order.`;

// Candidates beyond this get fast, free deterministic reasoning instead of
// an AI-written blurb — keeps latency and token cost bounded even when a
// much larger batch is requested (e.g. Premium's larger Discover feed),
// since a single AI call writing dozens of individual blurbs would be slow.
const AI_REASONING_BATCH_SIZE = 20;

/**
 * Adds AI-generated natural-language reasoning on top of the deterministic
 * scores. This is the "AI reasoning" step of the hybrid system — it never
 * runs alone; scoring.ts always runs first and this only refines its output.
 * Falls back to the deterministic reasons if AI is unavailable or fails
 * validation. For batches larger than AI_REASONING_BATCH_SIZE, only the top
 * slice (already the best matches, since candidates arrive pre-ranked) gets
 * AI reasoning — everything after that gets the deterministic reasons,
 * which are still specific and real, just not natural-language.
 */
export async function generateAIRecommendations(
  candidates: ScoredExperience[],
  context: RecommendationContext
): Promise<StructuredRecommendation[]> {
  const fallback = toFallback(candidates);
  if (!isAIConfigured() || candidates.length === 0) return fallback;

  const aiCandidates = candidates.slice(0, AI_REASONING_BATCH_SIZE);
  const remainder = toFallback(candidates.slice(AI_REASONING_BATCH_SIZE));

  const candidateSummaries = aiCandidates.map((c) => ({
    id: c.experience.id,
    title: c.experience.title,
    category: c.experience.category,
    tags: c.experience.tags,
    city: c.experience.city,
    priceLevel: c.experience.priceLevel,
    priceEstimate: c.experience.priceEstimate,
    durationMinutes: c.experience.durationMinutes,
    isHiddenGem: c.experience.isHiddenGem,
    deterministicScore: c.score,
    deterministicReasons: c.reasons,
  }));

  const prompt = `User profile:
- Interests: ${context.profile.interests.join(", ") || "none set"}
- Lifestyle goals: ${context.profile.lifestyleGoals.join(", ") || "none set"}
- Personality (0-100 scales): adventurous=${context.profile.personality.adventurousVsComfortable}, social=${context.profile.personality.quietVsSocial}, novelty-seeking=${context.profile.personality.familiarVsNovel}, spontaneous=${context.profile.personality.spontaneousVsPlanned}
- Budget preference: ${context.profile.preferences.budgetLevel}
- Location: ${context.location?.city ?? "unknown"}
- Current time: ${context.now}
- Weather: ${context.weather ? `${context.weather.condition}, ${context.weather.temperatureF}°F` : "unknown"}
- Recent behavior: ${context.recentEvents.slice(0, 5).join("; ") || "no recent activity"}

Candidate experiences (already filtered + scored deterministically):
${JSON.stringify(candidateSummaries, null, 2)}

Return a recommendation entry for each candidate, refining the score slightly if warranted and writing
a specific, personal reason for each.`;

  const result = await callStructuredTool<{ recommendations: unknown[] }>({
    system: SYSTEM_PROMPT,
    prompt,
    toolName: "submit_recommendations",
    toolDescription: "Submit refined, reasoned recommendations for the candidate experiences.",
    inputSchema: RECOMMEND_TOOL_SCHEMA,
  });

  if (!result) return fallback;

  const parsed = recommendationBatchSchema.safeParse(result);
  if (!parsed.success) {
    console.error("[ai] recommendation output failed validation:", parsed.error.message);
    return fallback;
  }

  // Guard against the model inventing an id outside what it was actually sent.
  const validIds = new Set(aiCandidates.map((c) => c.experience.id));
  const filtered = parsed.data.recommendations.filter((r) => validIds.has(r.experienceId));
  if (filtered.length === 0) return fallback;

  const reasoned = filtered.map((r) => {
    const candidate = aiCandidates.find((c) => c.experience.id === r.experienceId)!;
    return {
      experienceId: r.experienceId,
      matchScore: r.matchScore,
      reasoning: r.reasoning,
      estimatedCost: candidate.experience.priceEstimate,
      estimatedDurationMinutes: candidate.experience.durationMinutes,
      recommendedTime: null,
      confidence: r.confidence,
    };
  });

  return [...reasoned, ...remainder];
}

function toFallback(candidates: ScoredExperience[]): StructuredRecommendation[] {
  return candidates.map((c) => ({
    experienceId: c.experience.id,
    matchScore: c.score,
    reasoning: c.reasons.join(". "),
    estimatedCost: c.experience.priceEstimate,
    estimatedDurationMinutes: c.experience.durationMinutes,
    recommendedTime: null,
    confidence: 0.6,
  }));
}
