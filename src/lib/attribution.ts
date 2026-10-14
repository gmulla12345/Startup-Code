/**
 * Campaign attribution: the `src` and `code` values a visitor arrives with
 * (e.g. /students?code=CAMPUS-CLUB&src=poster-library).
 *
 *   src   where the link was placed. Lowercase: poster-library, groupme, ...
 *   code  the campaign / promo code carried in the link. Uppercase.
 *
 * They are captured in a first-party cookie by the proxy (src/proxy.ts), so it
 * works on any page without JavaScript, then:
 *   - every analytics event records them,
 *   - they are saved on the user record at signup (profiles.signup_src and
 *     signup_code), by the signup trigger or, for Google sign-in, by the auth
 *     callback.
 * Both are self-reported by whoever builds the link, so they are attribution
 * for analysis, never something to trust for access or pricing. (A promo code
 * is validated separately, on the server, before it does anything.)
 *
 * Pure and dependency-free: shared by the proxy, route handlers and the
 * browser. The mobile app passes the same two values when it signs a user up.
 */

export const ATTRIBUTION_COOKIE = "zolo_attr";
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface Attribution {
  src: string | null;
  code: string | null;
}

export const NO_ATTRIBUTION: Attribution = { src: null, code: null };

const SRC_PATTERN = /^[a-z0-9._-]{1,64}$/;
const CODE_PATTERN = /^[A-Z0-9._-]{1,64}$/;

/** Lowercase token, or null. The same rule the database enforces. */
export function sanitizeSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return SRC_PATTERN.test(v) ? v : null;
}

/** Uppercase token, or null. The same rule the database enforces. */
export function sanitizeCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  return CODE_PATTERN.test(v) ? v : null;
}

export function hasAttribution(a: Attribution | null | undefined): a is Attribution {
  return Boolean(a && (a.src || a.code));
}

/** Reads src and code from a URL's query string; null if neither is present and valid. */
export function attributionFromParams(params: URLSearchParams): Attribution | null {
  const attribution = { src: sanitizeSrc(params.get("src")), code: sanitizeCode(params.get("code")) };
  return hasAttribution(attribution) ? attribution : null;
}

export function serializeAttribution(a: Attribution): string {
  const params = new URLSearchParams();
  if (a.src) params.set("src", a.src);
  if (a.code) params.set("code", a.code);
  return params.toString();
}

/** Percent-decodes a value that is still encoded; leaves an already-decoded one alone. */
function decodeIfEncoded(raw: string): string {
  if (!/%[0-9A-Fa-f]{2}/.test(raw)) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Parses the cookie value; anything malformed or hostile comes back as no
 * attribution. Accepts the value either already decoded (what Next hands a
 * server component) or still percent-encoded (a raw Cookie header).
 */
export function parseAttribution(raw: string | null | undefined): Attribution {
  if (!raw) return NO_ATTRIBUTION;
  try {
    const params = new URLSearchParams(decodeIfEncoded(raw));
    return { src: sanitizeSrc(params.get("src")), code: sanitizeCode(params.get("code")) };
  } catch {
    return NO_ATTRIBUTION;
  }
}

/** Pulls the attribution out of a raw `Cookie:` header. */
export function attributionFromCookieHeader(header: string | null | undefined): Attribution {
  if (!header) return NO_ATTRIBUTION;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ATTRIBUTION_COOKIE) {
      let value = rest.join("=");
      try {
        value = decodeURIComponent(value);
      } catch {
        // keep the raw value; parseAttribution will reject it if it is bad
      }
      return parseAttribution(value);
    }
  }
  return NO_ATTRIBUTION;
}
