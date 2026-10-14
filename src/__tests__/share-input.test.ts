import { describe, expect, it } from "vitest";
import { cleanFirstName, cleanNote, placeIdFromExperienceId, stripUnwanted } from "@/lib/share/input";
import { SHARE_NOTE_MAX } from "@/lib/config/share";
import { SHARE_TOKEN_PATTERN, generateShareToken, isShareToken, shareTag } from "@/lib/share/token";

// What a person can type into a share, and the shape of the token that is the only
// way to find the page. Each rule on its own.

describe("a note", () => {
  const note = (raw: unknown) => cleanNote(raw);

  it("is optional: nothing, null and blank are all no note", () => {
    for (const raw of [undefined, null, "", "   ", "\n\t "]) expect(note(raw)).toEqual({ ok: true, note: null });
  });

  it("is kept as one tidy line", () => {
    expect(note("  Order the\n\nplum   tart.  ")).toEqual({ ok: true, note: "Order the plum tart." });
  });

  it("is plain text only: control characters and invisible direction marks are replaced", () => {
    const result = note("good\u0000 coffee‮ and​ quiet﻿");
    expect(result).toEqual({ ok: true, note: "good coffee and quiet" });
    expect(stripUnwanted("a\u0007b⁦c")).toBe("a b c");
  });

  it("may be exactly the limit, and not one character more", () => {
    expect(note("a".repeat(SHARE_NOTE_MAX))).toMatchObject({ ok: true });
    expect(note("a".repeat(SHARE_NOTE_MAX + 1))).toEqual({ ok: false, error: `Notes can be up to ${SHARE_NOTE_MAX} characters.` });
  });

  it("counts characters a person sees, not bytes: an accented letter or an emoji is one", () => {
    expect(note("é".repeat(SHARE_NOTE_MAX))).toMatchObject({ ok: true });
    expect(note("😀".repeat(SHARE_NOTE_MAX))).toMatchObject({ ok: true });
  });

  it("cannot carry a link, so our name is not lent to someone else's message", () => {
    for (const text of [
      "see https://example.com/x",
      "http://evil.test",
      "go to www.example.org now",
      "bit.ly is shorter",
      "claim it at free-prizes.com",
      "my site: cafe-notes.io",
      "tap t.ly/abc",
    ]) {
      expect(note(text), text).toEqual({ ok: false, error: "Notes cannot contain links." });
    }
  });

  it("can say ordinary things: punctuation, numbers, abbreviations, a name with a period", () => {
    for (const text of ["Go at 7.30, ask for Mr. Lee", "Best in town. Really.", "St. Mary's lawn", "4.5 stars in my book", "Saturday morning: quiet"]) {
      expect(note(text), text).toMatchObject({ ok: true });
    }
  });

  it("must be text", () => {
    for (const raw of [42, {}, ["a"], true]) expect(note(raw)).toEqual({ ok: false, error: "A note is text." });
  });
});

describe("the place in an experience id", () => {
  it("is the Google place id after the g- prefix", () => {
    expect(placeIdFromExperienceId("g-ChIJN1t_tDeuEmsRUsoyG83frY4")).toBe("ChIJN1t_tDeuEmsRUsoyG83frY4");
  });

  it("is nothing for a curated experience, a bare id, or anything malformed", () => {
    for (const id of [
      "0b8f3c9e-1111-4222-8333-444455556666", // a curated catalog uuid
      "ChIJN1t_tDeuEmsRUsoyG83frY4", // no prefix
      "g-short",
      "g-",
      "g-has spaces in it........",
      "g-../../etc/passwd..........",
      `g-${"a".repeat(301)}`,
      "g-id;drop table x;--......",
      "",
      42,
      null,
      undefined,
    ]) {
      expect(placeIdFromExperienceId(id), String(id)).toBeNull();
    }
  });
});

describe("a first name", () => {
  it("is tidied to one line of at most 30 characters", () => {
    expect(cleanFirstName("  Mary \n Ann ")).toBe("Mary Ann");
    expect(cleanFirstName("x".repeat(80))).toHaveLength(30);
  });

  it("is nothing when blank or not text", () => {
    for (const raw of ["", "   ", null, undefined, 5, {}]) expect(cleanFirstName(raw)).toBeNull();
  });
});

describe("the token", () => {
  it("is 22 URL-safe characters", () => {
    const token = generateShareToken();
    expect(token).toMatch(SHARE_TOKEN_PATTERN);
    expect(token).toHaveLength(22);
  });

  it("is never repeated, and carries no pattern a guess could use", () => {
    const tokens = Array.from({ length: 2000 }, generateShareToken);
    expect(new Set(tokens).size).toBe(tokens.length);
    // Every position draws on the whole alphabet: nothing like a counter, a timestamp or a fixed prefix.
    for (let position = 0; position < 21; position++) {
      expect(new Set(tokens.map((t) => t[position])).size, `position ${position}`).toBeGreaterThan(20);
    }
  });

  it("is recognised only in its exact shape", () => {
    expect(isShareToken(generateShareToken())).toBe(true);
    for (const value of ["", "short", "a".repeat(21), "a".repeat(23), `${"a".repeat(21)}!`, `${"a".repeat(21)} `, "../".repeat(8), null, undefined, 22, {}]) {
      expect(isShareToken(value), String(value)).toBe(false);
    }
  });

  it("has one cache tag, named for the link", () => {
    expect(shareTag("abc")).toBe("share:abc");
  });
});
