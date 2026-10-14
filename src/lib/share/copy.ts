import { brand } from "@/lib/config/brand";
import type { ShareView } from "./view";

/**
 * The words a share link wears outside the page: its title and description in a
 * link preview, and the headline on its preview image. In the brand voice: calm,
 * specific, no exclamation points, no emoji.
 */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface ShareCopy {
  /** What the thing is called. */
  title: string;
  /** One line under it. */
  description: string;
  /** A small label above the title on the preview image. */
  eyebrow: string;
  /** A line of detail on the preview image. */
  detail: string | null;
}

export function describeShare(view: ShareView): ShareCopy {
  const byline = view.sharerName ? `Shared by ${view.sharerName} on ${brand.name}.` : `Shared on ${brand.name}.`;
  const quoted = view.note ? `“${view.note}”` : null;

  if (view.kind === "place") {
    const place = view.place.status === "ok" ? view.place.place : null;
    return {
      title: place?.name ?? "A place shared with you",
      description: quoted ?? [place?.category, byline].filter(Boolean).join(". ").replace(/\.\./g, "."),
      // Without the place's name the title already says "shared with you"; do not say it twice.
      eyebrow: place ? "A place, shared with you" : brand.name,
      detail: place?.category ?? null,
    };
  }

  const { plan } = view;
  const size = [plural(plan.stopCount, "stop", "stops"), plan.dayCount > 0 ? plural(plan.dayCount, "day", "days") : null]
    .filter(Boolean)
    .join(" over ");
  const where = plan.city ? ` in ${plan.city}` : "";
  return {
    title: plan.title,
    description: quoted ?? `${size}${where}. ${byline}`,
    eyebrow: "A plan, shared with you",
    detail: `${size}${where}`,
  };
}
