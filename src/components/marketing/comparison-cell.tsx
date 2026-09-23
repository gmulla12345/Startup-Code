import { Check, Minus } from "lucide-react";

export type ComparisonCell = string | boolean;

// Boolean cells used to render icon-only (a bare <Check>/<Minus> svg, no text
// node) -- visually fine, but a checkmark-shaped path has no text content, so
// a crawler or AI assistant reading the table's text (not its rendered pixels)
// saw an empty cell. A heycatch site-audit finding (D4.2) caught this: "Saved
// experiences", "Map", "AI Weekend Planner", "AI Trip Planner" and the other
// boolean rows all read as blank in the static HTML's text content. Added
// `sr-only` text alongside each icon so the cell has a real "Included"/"Not
// included" text node for crawlers/screen readers, without changing how it
// looks to a sighted visitor.
export function ComparisonCellValue({ value }: { value: ComparisonCell }) {
  if (value === true)
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="h-4 w-4 text-ember" aria-hidden="true" />
        <span className="sr-only">Included</span>
      </span>
    );
  if (value === false)
    return (
      <span className="inline-flex items-center justify-center">
        <Minus className="h-4 w-4 text-foreground-subtle" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </span>
    );
  return <span className="text-foreground-muted">{value}</span>;
}
