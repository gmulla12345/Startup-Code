import { describe, expect, it } from "vitest";
import { campusForEmail, emailDomain, isEduEmail, isValidEmail, normalizeEmail, type Campus } from "@/lib/campus";

// The browser uses these to show which school an address belongs to as it is
// typed. The database's campus_for_email() is the authority and follows the same
// rule (rehearsed against production); these tests pin the rule itself.

const school: Campus = { slug: "sample-university", name: "Sample University", shortName: "Sample", emailDomains: ["school.edu"] };
const another: Campus = { slug: "example-college", name: "Example College", shortName: "Example", emailDomains: ["example.edu", "ex.edu"] };

describe("matching an address to a campus", () => {
  it("matches the campus domain, case-insensitively and ignoring surrounding space", () => {
    expect(campusForEmail("maya@school.edu", [school])).toBe(school);
    expect(campusForEmail("  MAYA@SCHOOL.EDU ", [school])).toBe(school);
  });

  it("matches a subdomain of the campus domain", () => {
    expect(campusForEmail("maya@students.school.edu", [school])).toBe(school);
    expect(campusForEmail("maya@mail.cs.school.edu", [school])).toBe(school);
  });

  it("does not match a lookalike", () => {
    for (const email of ["maya@notschool.edu", "maya@school.edu.evil.com", "maya@school.com", "maya@evilschool.edu", "maya@school-edu.com"]) {
      expect(campusForEmail(email, [school])).toBeNull();
    }
  });

  it("supports several domains per campus and several campuses", () => {
    expect(campusForEmail("a@ex.edu", [school, another])).toBe(another);
    expect(campusForEmail("a@example.edu", [school, another])).toBe(another);
    expect(campusForEmail("a@school.edu", [school, another])).toBe(school);
  });

  it("returns null for junk", () => {
    for (const email of ["", "no-at-sign", "@", "maya@"]) expect(campusForEmail(email, [school])).toBeNull();
  });
});

describe("school (.edu) addresses", () => {
  it("accepts a well-formed address ending in .edu, at any school", () => {
    expect(isEduEmail("a@school.edu")).toBe(true);
    expect(isEduEmail("A@Some.University.EDU")).toBe(true);
  });

  it("rejects everything else", () => {
    for (const email of ["a@gmail.com", "a@school.edu.com", "a@edu", "a@.edu", "a b@school.edu", "school.edu", "a@@school.edu", ""]) {
      expect(isEduEmail(email)).toBe(false);
    }
  });

  it("normalizes and splits addresses", () => {
    expect(normalizeEmail("  Maya@School.EDU ")).toBe("maya@school.edu");
    expect(emailDomain("Maya@School.EDU")).toBe("school.edu");
    expect(emailDomain("nope")).toBe("");
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("x".repeat(250) + "@b.co")).toBe(false);
  });
});
