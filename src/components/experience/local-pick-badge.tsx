import { MapPin } from "lucide-react";
import { LOCAL_PICK_LABEL } from "@/lib/config/local-picks";

/** The small badge on a place the owner has marked as a local pick. Shown only for those: never computed. */
export function LocalPickBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--primary-strong)]">
      <MapPin className="h-3 w-3" aria-hidden />
      {LOCAL_PICK_LABEL}
    </span>
  );
}
