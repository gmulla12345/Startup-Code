import {
  CLAUDE_FALLBACK_PRICE,
  CLAUDE_PRICE_PER_MTOK,
  PLACES_COST_USD,
  type PlacesOperation,
} from "@/lib/config/usage";

/** Estimated USD for one Claude request, from its reported token counts. */
export function estimateClaudeCost(model: string, tokensIn: number, tokensOut: number): number {
  const price = CLAUDE_PRICE_PER_MTOK[model] ?? CLAUDE_FALLBACK_PRICE;
  return (tokensIn * price.input + tokensOut * price.output) / 1_000_000;
}

/** Estimated USD for one Google Maps Platform request. */
export function estimatePlacesCost(operation: PlacesOperation, units = 1): number {
  return PLACES_COST_USD[operation] * units;
}
