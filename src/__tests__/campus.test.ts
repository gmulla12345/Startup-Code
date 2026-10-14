import { describe, expect, it } from "vitest";
import { FALLBACK_CAMPUSES, campusForEmail, emailDomain, isEduEmail, isValidEmail, normalizeEmail, type Campus } from "@/lib/campus";

// The browser uses these to show which school an address belongs to as it is
// typed. The database's campus_for_email() is the authority and follows the same
// rule (rehearsed against production); these tests pin the rule itself.

const loyola = FALLBACK_CAMPUSES.find((c) => c.slug === "loyola-maryland")!;
const another: Campus = { slug: "example-college", name: "Example College", shortName: "Example", emailDomains: ["example.edu", "ex.edu"] };

describe("matching an address to a campus", () => {
  it("matches the campus domain, case-insensitively and ignoring surrounding space", () => {
    expect(campusForEmail("maya@loyola.edu", [loyola])).toBe(loyola);
    expect(campusForEmail("  MAYA@LOYOLA.EDU ", [loyola])).toBe(loyola);
  });

  it("matches a subdomain of the campus domain", () => {
    expect(campusForEmail("maya@students.loyola.edu", [loyola])).toBe(loyola);
    expect(campusForEmail("maya@mail.cs.loyola.edu", [loyola])).toBe(loyola);
  });

  it("does not match a lookalike", () => {
    for (const email of ["maya@notloyola.edu", "maya@loyola.edu.evil.com", "maya@loyola.com", "maya@evilloyola.edu", "maya@loyola-edu.com"]) {
      expect(campusForEmail(email, [loyola])).toBeNull();
    }
  });

  it("supports several domains per campus and several campuses", () => {
    expect(campusForEmail("a@ex.edu", [loyola, another])).toBe(another);
    expect(campusForEmail("a@example.edu", [loyola, another])).toBe(another);
    expect(campusForEmail("a@loyola.edu", [loyola, another])).toBe(loyola);
  });

  it("returns null for junk", () => {
    for (const email of ["", "no-at-sign", "@", "maya@"]) expect(campusForEmail(email, [loyola])).toBeNull();
  });
});

describe("school (.edu) addresses", () => {
  it("accepts a well-formed address ending in .edu, at any school", () => {
    expect(isEduEmail("a@loyola.edu")).toBe(true);
    expect(isEduEmail("A@Some.University.EDU")).toBe(true);
  });

  it("rejects everything else", () => {
    for (const email of ["a@gmail.com", "a@loyola.edu.com", "a@edu", "a@.edu", "a b@loyola.edu", "loyola.edu", "a@@loyola.edu", ""]) {
      expect(isEduEmail(email)).toBe(false);
    }
  });

  it("normalizes and splits addresses", () => {
    expect(normalizeEmail("  Maya@Loyola.EDU ")).toBe("maya@loyola.edu");
    expect(emailDomain("Maya@Loyola.EDU")).toBe("loyola.edu");
    expect(emailDomain("nope")).toBe("");
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("x".repeat(250) + "@b.co")).toBe(false);
  });
});
