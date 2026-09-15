import { ArrowUpRight } from "lucide-react";
import { brand } from "@/lib/config/brand";
import type { Experience } from "@/types/database";

/**
 * Addresses the exact gap an outside AI review (Gemini) flagged: Zolo
 * "can occasionally miss real-time operational updates... you will still
 * want to double-check operating hours directly on venue sites." Rather
 * than trying to be more real-time than the data actually is, this box
 * makes the real limits visible instead of implicit — hours (when Google
 * has them), where the data comes from, and an explicit "confirm before
 * you go" line, on every experience page instead of buried in the FAQ.
 */
export function BeforeYouGo({ experience }: { experience: Experience }) {
  const mapsUrl = experience.sourceId
    ? `https://www.google.com/maps/place/?q=place_id:${experience.sourceId}`
    : null;
  const reportSubject = `Issue Report: ${experience.title}`;
  const reportBody = `Venue: ${experience.title}\nURL: ${brand.domain}/experience/${experience.slug}\n\nIssue: `;
  const reportHref = `mailto:${brand.supportEmail}?subject=${encodeURIComponent(reportSubject)}&body=${encodeURIComponent(reportBody)}`;

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface-sunken p-5">
      <h3 className="font-display text-lg font-semibold text-foreground mb-3">Before you go</h3>

      {experience.hoursToday ? (
        <div className="flex items-center gap-2 mb-2 text-sm flex-wrap">
          <span className={experience.isOpenNow ? "text-success font-medium" : "text-danger font-medium"}>
            {experience.isOpenNow ? "● Open now" : "● Closed now"}
          </span>
          <span className="text-foreground-muted">{experience.hoursToday}</span>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted mb-2">Hours unavailable — please check with the venue directly.</p>
      )}

      <p className="text-xs text-foreground-subtle mb-4">Place data sourced from Google, refreshed on each visit.</p>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
        {experience.website && (
          <a
            href={experience.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ember hover:underline inline-flex items-center gap-1"
          >
            Official website <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
        {experience.phone && (
          <a href={`tel:${experience.phone}`} className="text-sm text-ember hover:underline">
            {experience.phone}
          </a>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ember hover:underline inline-flex items-center gap-1"
          >
            View on Google Maps <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <p className="text-xs text-foreground-muted pt-3 border-t border-border">
        {brand.name} helps you discover places worth your time. Hours, pricing, availability, and ticket status can
        change — please confirm with the venue before heading out.
      </p>

      <a href={reportHref} className="text-xs text-foreground-subtle hover:underline mt-3 inline-block">
        Report outdated info, wrong category, or closed venue →
      </a>
    </div>
  );
}
