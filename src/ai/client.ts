import Anthropic from "@anthropic-ai/sdk";

/**
 * Single point of contact with the Anthropic API. Nothing else in the
 * codebase should import "@anthropic-ai/sdk" directly — this keeps the
 * model provider swappable and makes the "is AI configured" check
 * consistent everywhere.
 */
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

let client: Anthropic | null = null;

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropicClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set — AI features are unavailable.");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const AI_MODEL = MODEL;

/**
 * Runs a tool-forced call so the model must respond with the given tool's
 * input schema — this is how we get reliable structured JSON instead of
 * parsing free text. Returns null on any failure (timeout, bad JSON,
 * network error) so callers can fall back to non-AI logic.
 */
export async function callStructuredTool<T>(params: {
  system: string;
  prompt: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T | null> {
  if (!isAIConfigured()) return null;

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: params.maxTokens ?? 2048,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
      tools: [
        {
          name: params.toolName,
          description: params.toolDescription,
          input_schema: params.inputSchema as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: params.toolName },
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;

    return toolUse.input as T;
  } catch (err) {
    console.error("[ai] structured tool call failed:", err);
    return null;
  }
}
