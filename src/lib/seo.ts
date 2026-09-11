import { brand } from "@/lib/config/brand";

/**
 * Every indexable page needs an explicit self-referencing canonical tag —
 * without one, Google can index discoverzolo.com, discoverzolo.com/, and
 * https://discoverzolo.com as separate duplicate URLs, diluting ranking
 * signal. `path` is root-relative and must start with "/" (e.g. "/pricing").
 */
export function canonical(path: string): { alternates: { canonical: string } } {
  return { alternates: { canonical: `${brand.domain}${path}` } };
}
