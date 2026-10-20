import { describe, expect, it } from "vitest";
import { isDateString, throughLine, todayIn, windowState } from "@/lib/lists/window";

// This week's lists: when a list is shown. Dates are calendar dates, read in one zone, through the whole of the last day.

describe("a date", () => {
  it("is a real calendar day written YYYY-MM-DD", () => {
    for (const ok of ["2026-10-26", "2028-02-29", "2026-12-31"]) expect(isDateString(ok), ok).toBe(true);
  });

  it("is not anything else: impossible days, other formats, or other types", () => {
    for (const bad of ["2026-02-30", "2027-02-29", "2026-13-01", "2026-00-10", "26-10-26", "2026-1-5", "10/26/2026", "2026-10-26T00:00:00Z", "", " 2026-10-26", null, undefined, 20261026]) {
      expect(isDateString(bad), String(bad)).toBe(false);
    }
  });
});

describe("today", () => {
  it("is the date in the list's own zone, not the server's", () => {
    const lateNightUtc = new Date("2026-10-27T02:30:00Z"); // still the 26th in New York
    expect(todayIn("America/New_York", lateNightUtc)).toBe("2026-10-26");
    expect(todayIn("UTC", lateNightUtc)).toBe("2026-10-27");
    expect(todayIn("Asia/Tokyo", lateNightUtc)).toBe("2026-10-27");
  });

  it("follows daylight saving, which ends on 2026-11-01 in New York", () => {
    expect(todayIn("America/New_York", new Date("2026-11-01T04:30:00Z"))).toBe("2026-11-01"); // 00:30 EDT
    expect(todayIn("America/New_York", new Date("2026-11-01T05:30:00Z"))).toBe("2026-11-01"); // 01:30 EDT
    expect(todayIn("America/New_York", new Date("2026-11-02T04:59:00Z"))).toBe("2026-11-01"); // 23:59 EST
    expect(todayIn("America/New_York", new Date("2026-11-02T05:00:00Z"))).toBe("2026-11-02"); // 00:00 EST
  });
});

describe("whether a list is shown", () => {
  const w = { startsOn: "2026-10-26", endsOn: "2026-11-01" };

  it("is open from its first day through the whole of its last day", () => {
    for (const day of ["2026-10-26", "2026-10-30", "2026-11-01"]) expect(windowState(w, day), day).toBe("open");
  });

  it("is not yet open before its first day, and over after its last", () => {
    expect(windowState(w, "2026-10-25")).toBe("upcoming");
    expect(windowState(w, "2026-11-02")).toBe("ended");
  });

  it("is always open with no dates, open-ended with only a start, and open from now with only an end", () => {
    expect(windowState({ startsOn: null, endsOn: null }, "2030-01-01")).toBe("open");
    expect(windowState({ startsOn: "2026-10-26", endsOn: null }, "2030-01-01")).toBe("open");
    expect(windowState({ startsOn: "2026-10-26", endsOn: null }, "2026-10-25")).toBe("upcoming");
    expect(windowState({ startsOn: null, endsOn: "2026-11-01" }, "2020-01-01")).toBe("open");
    expect(windowState({ startsOn: null, endsOn: "2026-11-01" }, "2026-11-02")).toBe("ended");
  });

  it("is a single day when it starts and ends on the same one", () => {
    const day = { startsOn: "2026-10-28", endsOn: "2026-10-28" };
    expect([windowState(day, "2026-10-27"), windowState(day, "2026-10-28"), windowState(day, "2026-10-29")]).toEqual(["upcoming", "open", "ended"]);
  });
});

describe("the quiet line under a list that ends", () => {
  it("names the weekday when the last day is within the coming week", () => {
    expect(throughLine("2026-11-01", "2026-10-26")).toBe("Through Sunday"); // 2026-11-01 is a Sunday
    expect(throughLine("2026-10-28", "2026-10-27")).toBe("Through Wednesday");
    expect(throughLine("2026-11-01", "2026-10-26")).not.toMatch(/\d/);
  });

  it("says 'Through today' on the last day itself", () => {
    expect(throughLine("2026-11-01", "2026-11-01")).toBe("Through today");
  });

  it("gives the date when the last day is a week or more off", () => {
    expect(throughLine("2026-11-01", "2026-10-26")).toBe("Through Sunday"); // six days: still a weekday
    expect(throughLine("2026-11-01", "2026-10-25")).toBe("Through November 1"); // seven days
    expect(throughLine("2026-12-24", "2026-10-01")).toBe("Through December 24");
  });

  it("is worded in the brand's voice: calm, no exclamation point", () => {
    for (const [end, today] of [["2026-11-01", "2026-10-26"], ["2026-11-01", "2026-11-01"], ["2026-12-24", "2026-10-01"]]) {
      expect(throughLine(end, today)).not.toMatch(/!/);
    }
  });
});
