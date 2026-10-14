/**
 * Campuses and school email addresses. Pure and dependency-free: used by the
 * /students form in the browser (to show which school an address belongs to as
 * it is typed, with no network call and no address sent anywhere) and mirrored,
 * in SQL, by campus_for_email() in the database, which is the authority that
 * actually records a campus on a user once they confirm the address.
 *
 * The list of schools lives in the `campuses` table (a new school is an insert,
 * not a code change). FALLBACK_CAMPUSES only keeps the page rendering if that
 * table cannot be read, and must stay identical to the seeded row.
 */

export interface Campus {
  slug: string;
  name: string;
  shortName: string;
  emailDomains: string[];
}

/** Mirrors the row seeded by migrations/20261016_01_campuses_and_student_verification.sql. */
export const FALLBACK_CAMPUSES: Campus[] = [
  { slug: "loyola-maryland", name: "Loyola University Maryland", shortName: "Loyola", emailDomains: ["loyola.edu"] },
];

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const e = normalizeEmail(email);
  return e.length <= 254 && EMAIL_SHAPE.test(e);
}

export function emailDomain(email: string): string {
  const e = normalizeEmail(email);
  const at = e.lastIndexOf("@");
  return at < 0 ? "" : e.slice(at + 1);
}

/** A well-formed address at a .edu domain. */
export function isEduEmail(email: string): boolean {
  return isValidEmail(email) && /\.edu$/.test(emailDomain(email));
}

/**
 * The campus an address belongs to. A subdomain matches its parent
 * (students.loyola.edu is Loyola); a lookalike does not (notloyola.edu,
 * loyola.edu.example.com). Same rule as campus_for_email() in the database.
 */
export function campusForEmail(email: string, campuses: Campus[]): Campus | null {
  const domain = emailDomain(email);
  if (!domain) return null;
  return (
    campuses.find((c) =>
      c.emailDomains.some((d) => {
        const campusDomain = d.toLowerCase();
        return domain === campusDomain || domain.endsWith(`.${campusDomain}`);
      })
    ) ?? null
  );
}
