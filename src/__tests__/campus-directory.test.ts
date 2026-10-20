import { describe, expect, it } from "vitest";
import { CAMPUS_DIRECTORY } from "@/lib/campus-directory";
import { FALLBACK_CAMPUSES, campusForEmail, sortCampusesByName } from "@/lib/campus";

// The schools the owner asked to appear in the selector (2026-10-14), in the order
// they were given. The directory must contain exactly these: none dropped, none added.
const OWNER_LIST = [
  "Loyola University Maryland",
  "Johns Hopkins University",
  "Towson University",
  "University of Maryland, Baltimore County",
  "University of Maryland, College Park",
  "Georgetown University",
  "George Washington University",
  "American University",
  "Howard University",
  "Catholic University of America",
  "Villanova University",
  "University of Pennsylvania",
  "Temple University",
  "Drexel University",
  "Saint Joseph’s University",
  "University of Delaware",
  "Morgan State University",
  "Harvard University",
  "Yale University",
  "Princeton University",
  "Columbia University",
  "Brown University",
  "Cornell University",
  "Dartmouth College",
  "Massachusetts Institute of Technology",
  "Stanford University",
  "Duke University",
  "Northwestern University",
  "University of Chicago",
  "Vanderbilt University",
  "Rice University",
  "University of Notre Dame",
  "Emory University",
  "Carnegie Mellon University",
  "Washington University in St. Louis",
  "Tufts University",
  "Boston College",
  "Boston University",
  "Northeastern University",
  "New York University",
  "Fordham University",
  "University of Southern California",
  "Wake Forest University",
  "University of Virginia",
  "University of Michigan",
  "UC Berkeley",
  "UCLA",
  "Penn State University",
  "Ohio State University",
  "University of Texas at Austin",
  "Texas A&M University",
  "University of Florida",
  "Florida State University",
  "University of Georgia",
  "Georgia Tech",
  "UNC Chapel Hill",
  "NC State University",
  "Virginia Tech",
  "Clemson University",
  "University of Alabama",
  "Auburn University",
  "Louisiana State University",
  "University of Tennessee",
  "University of Wisconsin–Madison",
  "University of Illinois Urbana-Champaign",
  "Indiana University Bloomington",
  "Purdue University",
  "Michigan State University",
  "University of Minnesota",
  "University of Colorado Boulder",
  "Arizona State University",
  "University of Arizona",
  "University of Washington",
  "University of Oregon",
  "UC San Diego",
  "UC Santa Barbara",
  "UC Davis",
  "Rutgers University",
  "University of Pittsburgh",
  "University of South Carolina",
  "University of Kentucky",
  "University of Iowa",
  "University of Connecticut",
  "Syracuse University",
  "University of Miami",
  "Southern Methodist University",
  "Baylor University",
  "Texas Christian University",
  "Tulane University",
  "Marquette University",
  "Gonzaga University",
  "Santa Clara University",
  "University of Central Florida",
  "Texas Tech University",
  "Saint Louis University",
  "College of the Holy Cross",
  "Fairfield University",
  "James Madison University",
  "College of William & Mary",
  "University of Richmond",
];

describe("the school directory", () => {
  it("holds exactly the schools the owner listed", () => {
    expect(OWNER_LIST).toHaveLength(100);
    expect([...CAMPUS_DIRECTORY.map((c) => c.name)].sort()).toEqual([...OWNER_LIST].sort());
  });

  it("is the application's fallback list", () => {
    expect(FALLBACK_CAMPUSES).toBe(CAMPUS_DIRECTORY);
  });

  it("is written in alphabetical order, so a reviewer can see at a glance what is missing", () => {
    expect(CAMPUS_DIRECTORY.map((c) => c.name)).toEqual(sortCampusesByName(CAMPUS_DIRECTORY).map((c) => c.name));
  });

  it("gives every school a unique, well-formed slug that fits an analytics property", () => {
    const slugs = CAMPUS_DIRECTORY.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]{2,40}$/);
  });

  it("gives every school a short name and at least one lowercase .edu domain", () => {
    for (const c of CAMPUS_DIRECTORY) {
      expect(c.shortName.trim(), c.name).not.toBe("");
      expect(c.emailDomains.length, c.name).toBeGreaterThan(0);
      for (const d of c.emailDomains) expect(d, c.name).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.edu$/);
    }
  });

  it("never lets one address belong to two schools", () => {
    // Every domain, and a subdomain of it, must resolve to its own school and no other. This
    // catches a duplicate domain and a domain that is a subdomain of another's (sc.edu vs usc.edu is fine).
    for (const c of CAMPUS_DIRECTORY) {
      for (const d of c.emailDomains) {
        expect(campusForEmail(`student@${d}`, CAMPUS_DIRECTORY)?.slug, d).toBe(c.slug);
        expect(campusForEmail(`student@mail.${d}`, CAMPUS_DIRECTORY)?.slug, `mail.${d}`).toBe(c.slug);
      }
    }
    const all = CAMPUS_DIRECTORY.flatMap((c) => c.emailDomains);
    expect(new Set(all).size).toBe(all.length);
  });

  it("does not mistake a lookalike for a school", () => {
    for (const email of ["a@notmit.edu", "a@mit.edu.example.com", "a@mit.com", "a@xsc.edu"]) {
      expect(campusForEmail(email, CAMPUS_DIRECTORY), email).toBeNull();
    }
  });
});

describe("sortCampusesByName", () => {
  const names = (list: { name: string }[]) => list.map((c) => c.name);

  it("orders by name regardless of the order given, without changing the input", () => {
    const shuffled = [...CAMPUS_DIRECTORY].reverse();
    const copy = [...shuffled];
    expect(names(sortCampusesByName(shuffled))).toEqual(names(CAMPUS_DIRECTORY));
    expect(shuffled).toEqual(copy);
  });

  it("puts the school the product started with where it falls in the alphabet, not first", () => {
    const sorted = names(sortCampusesByName(CAMPUS_DIRECTORY));
    expect(sorted[0]).toBe("American University");
    expect(sorted.at(-1)).toBe("Yale University");
    const i = sorted.indexOf("Loyola University Maryland");
    expect(sorted[i - 1]).toBe("Louisiana State University");
    expect(sorted[i + 1]).toBe("Marquette University");
  });

  it("orders the awkward names sensibly", () => {
    const sorted = names(sortCampusesByName(CAMPUS_DIRECTORY));
    const before = (a: string, b: string) => expect(sorted.indexOf(a), `${a} before ${b}`).toBeLessThan(sorted.indexOf(b));
    before("UC Berkeley", "UCLA");
    before("UC San Diego", "UC Santa Barbara");
    before("Saint Joseph’s University", "Saint Louis University");
    before("University of Maryland, Baltimore County", "University of Maryland, College Park");
    before("College of the Holy Cross", "College of William & Mary");
  });
});
