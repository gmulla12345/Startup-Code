import { beforeEach, describe, expect, it, vi } from "vitest";

// Phase 0: every external Places / Claude call is logged, and a per-user daily
// allowance stops a runaway. These tests pin that behaviour: what gets logged
// (and what does not, such as a cache hit), the day boundary, the limits, and
// that a blocked call never reaches Google or Claude.

const h = vi.hoisted(() => ({
  plan: { plan_id: "free", status: "none" } as { plan_id: string; status: string; paused_from?: string; paused_until?: string } | null,
  usedRows: [] as { bucket: string; units: number }[],
  rpcError: null as null | { message: string },
  rpcCalls: 0,
  inserts: [] as Record<string, unknown>[],
  cache: new Map<string, unknown>(),
  create: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) =>
      table === "subscriptions"
        ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.plan }) }) }) }
        : {
            insert: async (row: Record<string, unknown>) => {
              h.inserts.push(row);
              return { error: null };
            },
          },
    rpc: async () => {
      h.rpcCalls++;
      return { data: h.usedRows, error: h.rpcError };
    },
  }),
}));
// after() runs the write straight away so the test can look at it.
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));
// A tiny stand-in for unstable_cache: the wrapped function runs only on a miss.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>, keyParts: string[]) => async () => {
    const key = keyParts.join("|");
    if (h.cache.has(key)) return h.cache.get(key);
    const value = await fn();
    h.cache.set(key, value);
    return value;
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: h.create };
  },
}));

import { estimateClaudeCost, estimatePlacesCost } from "@/lib/usage/costs";
import { startOfUsageDay, checkUsage, assertWithinLimit, UsageLimitError } from "@/lib/usage/limits";
import { usageContext } from "@/lib/usage/context";
import { recordUsage } from "@/lib/usage/log";
import { fetchGoogleJson } from "@/lib/google/places-fetch";
import { DAILY_LIMITS } from "@/lib/config/usage";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  h.plan = { plan_id: "free", status: "none" };
  h.usedRows = [];
  h.rpcError = null;
  h.rpcCalls = 0;
  h.inserts.length = 0;
  h.cache.clear();
  h.create.mockReset();
  vi.unstubAllGlobals();
});

describe("estimated cost", () => {
  it("prices Claude from reported tokens at the model's list price", () => {
    // Sonnet 5: $2 in / $10 out per million tokens.
    expect(estimateClaudeCost("claude-sonnet-5", 1500, 450)).toBeCloseTo(0.0075, 6);
    // Haiku 5.5 is about 19x cheaper.
    expect(estimateClaudeCost("claude-haiku-5-5", 1500, 450)).toBeCloseTo(0.000375, 6);
  });

  it("never prices an unknown model at zero", () => {
    expect(estimateClaudeCost("some-future-model", 1_000_000, 0)).toBeGreaterThan(0);
  });

  it("prices Places calls at Google's list price", () => {
    expect(estimatePlacesCost("nearby_search")).toBeCloseTo(0.032, 6);
    expect(estimatePlacesCost("nearby_search", 7)).toBeCloseTo(0.224, 6);
    expect(estimatePlacesCost("place_details")).toBeCloseTo(0.025, 6);
    expect(estimatePlacesCost("place_photo")).toBeCloseTo(0.007, 6);
  });
});

describe("the daily window", () => {
  it("starts at midnight Eastern, in daylight and standard time", () => {
    expect(startOfUsageDay(new Date("2026-10-14T15:30:00Z")).toISOString()).toBe("2026-10-14T04:00:00.000Z");
    // 03:00 UTC is still the previous evening in New York.
    expect(startOfUsageDay(new Date("2026-10-14T03:00:00Z")).toISOString()).toBe("2026-10-13T04:00:00.000Z");
    expect(startOfUsageDay(new Date("2026-12-10T12:00:00Z")).toISOString()).toBe("2026-12-10T05:00:00.000Z");
  });
});

describe("daily limits", () => {
  it("never limits an anonymous context (there is no account to count against)", async () => {
    const check = await checkUsage(usageContext(null, "catalog"), "places");
    expect(check.allowed).toBe(true);
    expect(h.rpcCalls).toBe(0);
  });

  it("allows a free user up to the limit and no further", async () => {
    h.usedRows = [{ bucket: "places", units: DAILY_LIMITS.free.places - 1 }];
    const ctx = usageContext("user-limit-free", "home");
    expect((await checkUsage(ctx, "places", 1)).allowed).toBe(true);
    expect((await checkUsage(ctx, "places", 2)).allowed).toBe(false);
  });

  it("gives Premium the higher limits", async () => {
    h.plan = { plan_id: "premium", status: "active" };
    h.usedRows = [{ bucket: "ai", units: DAILY_LIMITS.free.ai }];
    expect((await checkUsage(usageContext("user-limit-premium", "weekend_plan"), "ai")).allowed).toBe(true);
  });

  it("treats a canceled Premium plan as free", async () => {
    h.plan = { plan_id: "premium", status: "canceled" };
    h.usedRows = [{ bucket: "ai", units: DAILY_LIMITS.free.ai }];
    expect((await checkUsage(usageContext("user-limit-canceled", "weekend_plan"), "ai")).allowed).toBe(false);
  });

  it("gives a Premium subscriber Free's limits during the one month they have paused, and Premium's before and after", async () => {
    h.usedRows = [{ bucket: "ai", units: DAILY_LIMITS.free.ai }];
    const day = 86_400_000;
    const around = (from: number, until: number) => ({ plan_id: "premium", status: "active", paused_from: new Date(Date.now() + from).toISOString(), paused_until: new Date(Date.now() + until).toISOString() });
    h.plan = around(-day, day); // the skipped month is under way
    expect((await checkUsage(usageContext("user-limit-paused", "weekend_plan"), "ai")).allowed).toBe(false);
    h.plan = around(day, 2 * day); // paid period still running
    expect((await checkUsage(usageContext("user-limit-pause-scheduled", "weekend_plan"), "ai")).allowed).toBe(true);
    h.plan = around(-2 * day, -day); // over
    expect((await checkUsage(usageContext("user-limit-pause-over", "weekend_plan"), "ai")).allowed).toBe(true);
  });

  it("reads today's usage once per request, however many calls check it", async () => {
    const ctx = usageContext("user-limit-memo", "home");
    await Promise.all([1, 2, 3, 4, 5, 6, 7].map(() => checkUsage(ctx, "places")));
    expect(h.rpcCalls).toBe(1);
  });

  it("counts a call it just made against the same request's allowance", async () => {
    h.usedRows = [{ bucket: "ai", units: DAILY_LIMITS.free.ai - 1 }];
    const ctx = usageContext("user-limit-live", "surprise_me");
    expect((await checkUsage(ctx, "ai")).allowed).toBe(true);
    recordUsage(ctx, { provider: "anthropic", operation: "messages", estCostUsd: 0.01 });
    await flush();
    expect((await checkUsage(ctx, "ai")).allowed).toBe(false);
  });

  it("assertWithinLimit throws a limit error carrying the bucket and the limit", async () => {
    h.usedRows = [{ bucket: "ai", units: DAILY_LIMITS.free.ai }];
    await expect(assertWithinLimit(usageContext("user-limit-throw", "surprise_me"), "ai")).rejects.toMatchObject({
      name: "UsageLimitError",
      bucket: "ai",
      limit: DAILY_LIMITS.free.ai,
    });
  });

  it("fails open if the usage lookup errors: a cost control must not take discovery down", async () => {
    h.rpcError = { message: "db down" };
    h.usedRows = [];
    // An error returns no rows: nothing used, so allowed.
    expect((await checkUsage(usageContext("user-limit-open", "home"), "places")).allowed).toBe(true);
  });
});

describe("logging", () => {
  it("writes the documented columns and nothing that identifies a person beyond the user id", async () => {
    recordUsage(usageContext("user-log-1", "weekend_plan"), {
      provider: "anthropic",
      operation: "messages",
      model: "claude-sonnet-5",
      tokensIn: 2700,
      tokensOut: 1000,
      estCostUsd: 0.0154,
    });
    await flush();
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0]).toEqual({
      user_id: "user-log-1",
      provider: "anthropic",
      bucket: "ai",
      operation: "messages",
      feature: "weekend_plan",
      model: "claude-sonnet-5",
      tokens_in: 2700,
      tokens_out: 1000,
      units: 1,
      est_cost_usd: 0.0154,
      outcome: "ok",
    });
  });

  it("logs an anonymous call with a null user", async () => {
    recordUsage(usageContext(null, "photo"), { provider: "google_places", operation: "place_photo", estCostUsd: 0.007 });
    await flush();
    expect(h.inserts[0]).toMatchObject({ user_id: null, bucket: "places", feature: "photo" });
  });
});

describe("Google Maps requests", () => {
  const nearby = { status: "OK", results: [] };
  const run = (usage = usageContext("user-g-1", "home"), revalidate: number | false = 3600) =>
    fetchGoogleJson<{ status: string }>({
      operation: "nearby_search",
      url: "https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=SECRET",
      cacheKey: ["40.71", "-74.01", "50000", "restaurant", ""],
      revalidate,
      usage,
    });

  it("logs one row, at list price, for a real call", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(nearby), { status: 200 })));
    const result = await run();
    await flush();
    expect(result.ok).toBe(true);
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0]).toMatchObject({
      provider: "google_places",
      operation: "nearby_search",
      feature: "home",
      user_id: "user-g-1",
      est_cost_usd: 0.032,
      outcome: "ok",
    });
    // The key is in the URL we fetch, never in what is stored.
    expect(JSON.stringify(h.inserts)).not.toContain("SECRET");
  });

  it("logs nothing for an answer served from the cache", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(nearby), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await run();
    await run(usageContext("user-g-2", "discover"));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(h.inserts).toHaveLength(1);
  });

  it("does not cache a REQUEST_DENIED, logs it as an error at zero cost, and retries next time", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: "REQUEST_DENIED" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const first = await run();
    await run();
    await flush();
    expect(first).toMatchObject({ ok: false, status: "REQUEST_DENIED" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(h.inserts.every((r) => r.outcome === "error" && r.est_cost_usd === 0)).toBe(true);
  });

  it("refuses the call, without contacting Google, once the daily Places allowance is used", async () => {
    h.usedRows = [{ bucket: "places", units: DAILY_LIMITS.free.places }];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await run(usageContext("user-g-blocked", "home"));
    await flush();
    expect(result).toMatchObject({ ok: false, limited: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0]).toMatchObject({ outcome: "blocked", est_cost_usd: 0 });
  });

  it("does not cache when revalidate is false, so every call is logged", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(nearby), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await run(usageContext("user-g-3", "geocode"), false);
    await run(usageContext("user-g-3", "geocode"), false);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(h.inserts).toHaveLength(2);
  });
});

describe("Claude requests", () => {
  const response = (inTok = 1500, outTok = 450) => ({
    content: [{ type: "tool_use", name: "submit", input: { ok: true } }],
    usage: { input_tokens: inTok, output_tokens: outTok },
  });
  const call = async (usage = usageContext("user-c-1", "surprise_me")) => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.resetModules();
    const { callStructuredTool } = await import("@/ai/client");
    return callStructuredTool<{ ok: boolean }>({
      system: "s",
      prompt: "p",
      toolName: "submit",
      toolDescription: "d",
      inputSchema: { type: "object" },
      usage,
    });
  };

  it("logs model, tokens and estimated cost for a call", async () => {
    h.create.mockResolvedValue(response());
    expect(await call()).toEqual({ ok: true });
    await flush();
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0]).toMatchObject({
      provider: "anthropic",
      bucket: "ai",
      operation: "messages",
      feature: "surprise_me",
      user_id: "user-c-1",
      tokens_in: 1500,
      tokens_out: 450,
      outcome: "ok",
    });
    expect(Number(h.inserts[0].est_cost_usd)).toBeGreaterThan(0);
  });

  it("returns null without calling Claude once the daily AI allowance is used", async () => {
    h.usedRows = [{ bucket: "ai", units: DAILY_LIMITS.free.ai }];
    expect(await call(usageContext("user-c-blocked", "surprise_me"))).toBeNull();
    await flush();
    expect(h.create).not.toHaveBeenCalled();
    expect(h.inserts[0]).toMatchObject({ outcome: "blocked", est_cost_usd: 0 });
  });

  it("logs a failed call as an error and still returns null", async () => {
    h.create.mockRejectedValue(new Error("timeout"));
    expect(await call(usageContext("user-c-fail", "weekend_plan"))).toBeNull();
    await flush();
    expect(h.inserts[0]).toMatchObject({ outcome: "error", est_cost_usd: 0 });
  });

  it("UsageLimitError is what the routes turn into a 429", () => {
    expect(new UsageLimitError("ai", 10).message).toMatch(/today's limit/);
  });
});
