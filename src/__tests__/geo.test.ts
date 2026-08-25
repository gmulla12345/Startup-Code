import { describe, expect, it } from "vitest";
import { distanceMiles } from "@/lib/utils/geo";

describe("distanceMiles", () => {
  it("returns ~0 for identical coordinates", () => {
    expect(distanceMiles(39.29, -76.61, 39.29, -76.61)).toBeCloseTo(0, 5);
  });

  it("returns a positive distance between two different points", () => {
    // Baltimore, MD -> Washington, DC (~35 miles)
    const d = distanceMiles(39.2904, -76.6122, 38.9072, -77.0369);
    expect(d).toBeGreaterThan(30);
    expect(d).toBeLessThan(45);
  });

  it("is symmetric", () => {
    const a = distanceMiles(39.29, -76.61, 40.71, -74.0);
    const b = distanceMiles(40.71, -74.0, 39.29, -76.61);
    expect(a).toBeCloseTo(b, 5);
  });
});
