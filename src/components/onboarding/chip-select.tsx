"use client";

import { cn } from "@/lib/utils/cn";

export function ChipSelect<T extends string>({
  options,
  selected,
  onToggle,
  columns = 2,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  columns?: number;
}) {
  // columns=1 (longer, sentence-length labels like lifestyle goals) keeps
  // full-width stacked rows; the default flows short labels as pills, same
  // language as PillGroup, so selection state reads consistently everywhere.
  const stacked = columns === 1;

  return (
    <div className={cn(stacked ? "flex flex-col gap-2" : "flex flex-wrap gap-2")}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={cn(
              "text-sm font-medium transition-colors border",
              stacked ? "rounded-[var(--radius-md)] px-4 py-3 text-left" : "rounded-full px-4 py-2",
              active
                ? "bg-forest text-white border-forest"
                : "border-border-strong text-foreground hover:bg-surface-sunken"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
