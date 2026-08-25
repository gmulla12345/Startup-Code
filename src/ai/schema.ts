import { z } from "zod";

/**
 * Schema the model's structured tool-call output must satisfy. Anything
 * that fails validation is discarded and we fall back to the deterministic
 * hybrid scorer — the UI never renders unvalidated AI output.
 */
export const structuredRecommendationSchema = z.object({
  experienceId: z.string(),
  matchScore: z.number().min(0).max(100),
  reasoning: z.string().min(1).max(400),
  confidence: z.number().min(0).max(1),
});

export const recommendationBatchSchema = z.object({
  recommendations: z.array(structuredRecommendationSchema).min(1),
});

export type RecommendationBatch = z.infer<typeof recommendationBatchSchema>;

export const weekendPlanItemSchema = z.object({
  day: z.string(),
  startTime: z.string(),
  title: z.string(),
  experienceId: z.string().nullable(),
  estimatedCost: z.number().nullable(),
  notes: z.string(),
});

export const weekendPlanSchema = z.object({
  items: z.array(weekendPlanItemSchema).min(1),
  summary: z.string(),
});

export type WeekendPlanAI = z.infer<typeof weekendPlanSchema>;
