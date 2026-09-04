import { Check, Minus } from "lucide-react";

export type ComparisonCell = string | boolean;

/** Shared cell renderer for the /pricing and /vs feature comparison tables. */
export function ComparisonCellValue({ value }: { value: ComparisonCell }) {
  if (value === true) return <Check className="h-4 w-4 text-forest mx-auto" />;
  if (value === false) return <Minus className="h-4 w-4 text-foreground-subtle mx-auto" />;
  return <span className="text-foreground-muted">{value}</span>;
}
