import { callStructuredTool, isAIConfigured } from "./client";
import { itineraryChatIntentSchema, itineraryChatPickSchema, type ItineraryChatIntent, type ItineraryChatPick } from "./schema";
import { brand } from "@/lib/config/brand";
import type { Itinerary, ItineraryItem } from "@/types/database";
import type { SwapCandidate } from "@/lib/repositories/itineraries";

const INTENT_TOOL_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["remove", "swap", "clarify"] },
    itemId: { type: ["string", "null"] },
    preference: { type: ["string", "null"] },
    reply: { type: "string" },
  },
  required: ["action", "itemId", "preference", "reply"],
} as const;

const INTENT_SYSTEM_PROMPT = `You are ${brand.name}'s itinerary chat assistant. A user is looking at
their trip itinerary and typed a free-form request to change it. Your only job is figuring out
WHICH single item they mean and WHAT they want done to it — you never invent details about real
places yourself, that happens in a separate step.

Rules:
- action "remove": they want to delete an item entirely (clear the slot, cancel it, skip it).
- action "swap": they want a different activity/place in that slot. Put what they're looking for
  instead in "preference" (e.g. "something cheaper", "outdoors", "not another museum") — if they
  didn't say what they want instead, use a general note like "something different".
- action "clarify": you can't tell which single item they mean, or the request doesn't map to a
  swap/remove of one existing item (e.g. reordering days, adding a whole new day, changing dates).
  Briefly explain in "reply" what you can actually help with right now.
- itemId must be exactly one of the item ids given below, or null only when action is "clarify".
- reply is a short (under 20 words), friendly, present-tense message shown in the chat immediately,
  before anything is actually changed — describe the ACTION you're taking, not an outcome you don't
  know yet. E.g. "Swapping today's lunch for something cheaper..." or "Removing the museum visit on
  Tuesday." Never mention a specific replacement place here — you don't know it yet.`;

/**
 * First step of the chat-editing flow: figure out which item and what kind
 * of change, from a free-form message. Never touches real place data — see
 * pickSwapCandidate for the step that actually picks a real replacement.
 */
export async function interpretItineraryChat(
  message: string,
  itinerary: Itinerary,
  items: ItineraryItem[]
): Promise<ItineraryChatIntent | null> {
  if (!isAIConfigured()) return null;

  const itemSummaries = items.map((i) => ({
    id: i.id,
    day: i.dayIndex + 1,
    time: i.startTime,
    title: i.title,
    notes: i.notes,
  }));

  const prompt = `Itinerary: ${itinerary.title}${itinerary.destinationCity ? ` in ${itinerary.destinationCity}` : ""}

Current items:
${JSON.stringify(itemSummaries, null, 2)}

User's request: "${message}"`;

  const result = await callStructuredTool<{ action: string; itemId: string | null; preference: string | null; reply: string }>({
    system: INTENT_SYSTEM_PROMPT,
    prompt,
    toolName: "submit_intent",
    toolDescription: "Submit the interpreted action for the user's itinerary edit request.",
    inputSchema: INTENT_TOOL_SCHEMA,
    maxTokens: 300,
    timeoutMs: 10_000,
  });
  if (!result) return null;

  const parsed = itineraryChatIntentSchema.safeParse(result);
  if (!parsed.success) return null;

  const validIds = new Set(items.map((i) => i.id));
  if (parsed.data.itemId && !validIds.has(parsed.data.itemId)) {
    return {
      action: "clarify",
      itemId: null,
      preference: null,
      reply: "I couldn't tell which activity you meant — could you name the day or activity directly?",
    };
  }
  return parsed.data;
}

const PICK_TOOL_SCHEMA = {
  type: "object",
  properties: {
    experienceId: { type: ["string", "null"] },
    reply: { type: "string" },
  },
  required: ["experienceId", "reply"],
} as const;

const PICK_SYSTEM_PROMPT = `You are picking a real replacement activity from a list of real, live
candidates near the destination — never invent a place or describe one that isn't in the list. Pick
the one that best matches what the user asked for. If none of the candidates reasonably fit, return
experienceId: null and say so in "reply". Keep "reply" short (under 20 words), present-tense, and
specific, e.g. "Swapped in Joe's Pizza — cheaper and just as close." or "Nothing nearby really fit
'quiet and outdoors' — try being more specific."`;

/**
 * Second step, only reached for a "swap": picks from real candidates
 * (never AI-generated — same live provider data the click-to-swap picker
 * uses) based on the free-form preference extracted by interpretItineraryChat.
 */
export async function pickSwapCandidate(
  preference: string,
  candidates: SwapCandidate[]
): Promise<ItineraryChatPick | null> {
  if (!isAIConfigured() || candidates.length === 0) return null;

  const prompt = `What the user wants instead: "${preference}"

Real candidates nearby:
${JSON.stringify(candidates, null, 2)}

Pick the best match.`;

  const result = await callStructuredTool<{ experienceId: string | null; reply: string }>({
    system: PICK_SYSTEM_PROMPT,
    prompt,
    toolName: "submit_pick",
    toolDescription: "Submit the chosen replacement experience id.",
    inputSchema: PICK_TOOL_SCHEMA,
    maxTokens: 200,
    timeoutMs: 10_000,
  });
  if (!result) return null;

  const parsed = itineraryChatPickSchema.safeParse(result);
  if (!parsed.success) return null;

  if (parsed.data.experienceId && !candidates.some((c) => c.experienceId === parsed.data.experienceId)) {
    return { experienceId: null, reply: "Nothing quite matched — try being more specific about what you'd like instead." };
  }
  return parsed.data;
}
