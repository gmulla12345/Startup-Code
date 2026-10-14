import { beforeEach, describe, expect, it, vi } from "vitest";

// A per-account limit cannot stop a spike that comes from strangers, such as a
// shared link going round a campus, so Google calls made for visitors with no
// account are held to a daily ceiling for their feature. Reaching it turns off
// the live Google details for the day; the page itself still loads.

const h = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: h.rpc }) }));

import { ANONYMOUS_DAILY_PLACES_CAPS } from "@/lib/config/usage";
import { UsageLimitError, assertWithinLimit, checkUsage } from "@/lib/usage/limits";
import { usageContext } from "@/lib/usage/context";

const CAP = ANONYMOUS_DAILY_PLACES_CAPS.share_preview;

beforeEach(() => {
  h.rpc.mockReset().mockResolvedValue({ data: 0, error: null });
});

describe("Google calls for shared-link previews, made for visitors with no account", () => {
  it("have a daily ceiling", () => {
    expect(CAP).toBeGreaterThan(0);
  });

  it("are allowed while today's count plus this call fits under it", async () => {
    h.rpc.mockResolvedValue({ data: CAP - 1, error: null });
    expect(await checkUsage(usageContext(null, "share_preview"), "places")).toEqual({ allowed: true, limit: CAP, used: CAP - 1 });
  });

  it("are refused once the ceiling is reached", async () => {
    h.rpc.mockResolvedValue({ data: CAP, error: null });
    const ctx = usageContext(null, "share_preview");
    expect(await checkUsage(ctx, "places")).toMatchObject({ allowed: false, limit: CAP, used: CAP });
    await expect(assertWithinLimit(ctx, "places")).rejects.toBeInstanceOf(UsageLimitError);
  });

  it("count every account's anonymous use of this one feature for today", async () => {
    await checkUsage(usageContext(null, "share_preview"), "places");
    expect(h.rpc).toHaveBeenCalledWith("usage_units_for_feature_since", {
      p_feature: "share_preview",
      p_since: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it("read the count once per request, however many calls the request makes", async () => {
    const ctx = usageContext(null, "share_preview");
    await checkUsage(ctx, "places");
    await checkUsage(ctx, "places");
    await checkUsage(ctx, "places");
    expect(h.rpc).toHaveBeenCalledTimes(1);
  });

  it("are allowed, and logged, if the count cannot be read: a cost control does not take the page down", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: "connection reset" } });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await checkUsage(usageContext(null, "share_preview"), "places")).toMatchObject({ allowed: true });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("everything else is as before", () => {
  it("other anonymous features have no ceiling here, and read nothing", async () => {
    for (const feature of ["home", "discover", "experience_detail", "catalog", "unknown"] as const) {
      expect(await checkUsage(usageContext(null, feature), "places")).toEqual({ allowed: true, limit: Infinity, used: 0 });
    }
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("the AI bucket for an anonymous visitor is not touched", async () => {
    expect(await checkUsage(usageContext(null, "share_preview"), "ai")).toEqual({ allowed: true, limit: Infinity, used: 0 });
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("no context at all is still allowed", async () => {
    expect(await checkUsage(undefined, "places")).toEqual({ allowed: true, limit: Infinity, used: 0 });
  });
});
