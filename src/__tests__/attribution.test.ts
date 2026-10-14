import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  ATTRIBUTION_COOKIE,
  attributionFromCookieHeader,
  attributionFromParams,
  parseAttribution,
  sanitizeCode,
  sanitizeSrc,
  serializeAttribution,
} from "@/lib/attribution";
import { captureAttribution } from "@/lib/attribution-cookie";

// src and code arrive from a URL anyone can edit, are stored in a cookie, copied
// onto the user record, and printed on an admin page. They have to be inert:
// short lowercase / uppercase tokens or nothing.

describe("src and code", () => {
  it("normalizes src to lowercase and code to uppercase", () => {
    expect(sanitizeSrc("Poster-Library")).toBe("poster-library");
    expect(sanitizeCode("loyola-businessclub")).toBe("LOYOLA-BUSINESSCLUB");
  });

  it("accepts the documented example", () => {
    const a = attributionFromParams(new URLSearchParams("code=LOYOLA-BUSINESSCLUB&src=poster-library"));
    expect(a).toEqual({ src: "poster-library", code: "LOYOLA-BUSINESSCLUB" });
  });

  it("rejects anything that is not a plain token", () => {
    for (const bad of ["a b", "x'; drop table profiles;--", "<script>", "a@b.com", "../etc", "😀", "", "x".repeat(65)]) {
      expect(sanitizeSrc(bad)).toBeNull();
      expect(sanitizeCode(bad)).toBeNull();
    }
    expect(sanitizeSrc(42)).toBeNull();
    expect(sanitizeSrc(undefined)).toBeNull();
  });

  it("keeps a valid half when the other is hostile", () => {
    expect(attributionFromParams(new URLSearchParams("src=groupme&code=<b>"))).toEqual({ src: "groupme", code: null });
  });

  it("returns null when neither value is present or valid", () => {
    expect(attributionFromParams(new URLSearchParams(""))).toBeNull();
    expect(attributionFromParams(new URLSearchParams("src=a b&code=c d"))).toBeNull();
    expect(attributionFromParams(new URLSearchParams("utm_source=x"))).toBeNull();
  });
});

describe("the cookie value", () => {
  it("round-trips", () => {
    const value = serializeAttribution({ src: "poster-library", code: "LOYOLA-BUSINESSCLUB" });
    expect(parseAttribution(value)).toEqual({ src: "poster-library", code: "LOYOLA-BUSINESSCLUB" });
  });

  it("treats a tampered cookie as no attribution, never as an error", () => {
    expect(parseAttribution("src=%00&code=%FF")).toEqual({ src: null, code: null });
    expect(parseAttribution("garbage")).toEqual({ src: null, code: null });
    expect(parseAttribution(undefined)).toEqual({ src: null, code: null });
  });

  it("is found in a raw Cookie header among other cookies", () => {
    const header = `sb-token=abc; ${ATTRIBUTION_COOKIE}=${encodeURIComponent("src=dorm-flyer&code=HOUSES-1")}; theme=dark`;
    expect(attributionFromCookieHeader(header)).toEqual({ src: "dorm-flyer", code: "HOUSES-1" });
    expect(attributionFromCookieHeader("sb-token=abc")).toEqual({ src: null, code: null });
    expect(attributionFromCookieHeader(null)).toEqual({ src: null, code: null });
  });
});

describe("capturing it in the proxy", () => {
  const run = (url: string, existing?: string) => {
    const request = new NextRequest(url, existing ? { headers: { cookie: `${ATTRIBUTION_COOKIE}=${encodeURIComponent(existing)}` } } : undefined);
    const response = NextResponse.next();
    captureAttribution(request, response);
    return response.cookies.get(ATTRIBUTION_COOKIE);
  };

  it("stores src and code from a campaign link for 30 days, readable by the signup form", () => {
    const cookie = run("https://discoverzolo.com/students?code=loyola-businessclub&src=Poster-Library");
    expect(parseAttribution(decodeURIComponent(cookie!.value))).toEqual({ src: "poster-library", code: "LOYOLA-BUSINESSCLUB" });
    expect(cookie).toMatchObject({ maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", httpOnly: false });
  });

  it("lets the most recent campaign link replace an older one", () => {
    const cookie = run("https://discoverzolo.com/?src=groupme", "src=poster-library&code=OLD");
    expect(parseAttribution(decodeURIComponent(cookie!.value))).toEqual({ src: "groupme", code: null });
  });

  it("leaves the cookie alone on an ordinary request or an invalid link", () => {
    expect(run("https://discoverzolo.com/pricing")).toBeUndefined();
    expect(run("https://discoverzolo.com/?src=<script>&code=a b")).toBeUndefined();
  });
});
