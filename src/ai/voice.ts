/**
 * The product's written voice, as one rule every AI prompt shares: calm,
 * specific, understated; no exclamation points, emojis, slang, or marketing
 * language. The model's text is user-facing copy (a recommendation's reason, a
 * plan's summary and notes, a chat reply), so it is held to the same standard
 * as the pages. Keep it here, once, so the four prompts cannot drift apart.
 *
 * NO QUOTATION MARKS OR BACKTICKS IN THIS TEXT. A first draft listed the words to
 * avoid in double quotes, and the Weekend Planner then broke: Claude answered the
 * forced tool call with the whole { items, summary } object double-encoded as a
 * string inside `items`, validation failed, and the user silently got the non-AI
 * fallback plan (6 of 6 runs). The same rule without quotes: 6 of 6 fine, and so
 * was the prompt with no rule at all. A test enforces this.
 */
export const VOICE_RULE =
  "Voice: calm, specific, and understated, like a well-edited guidebook. Plain sentences. No exclamation points, no emojis, no slang, and no marketing language such as vibe, epic, amazing, or perfect.";
