"use client";

import { cn } from "@/lib/utils/cn";

export function ChipSelect<T extends string>({
  options,
  selected,
  onToggle,
  columns = 2,
}: {
  options: { value: T; label: string; emoji?: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  columns?: number;
}) {
  return (
    <div className={cn("grid gap-2", columns === 2 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1")}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={cn(
              "flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium transition-colors text-left",
              active
                ? "bg-[var(--ember-soft)] border-ember text-[var(--ember-strong)]"
                : "border-border-strong text-foreground hover:bg-surface-sunken"
            )}
          >
            {opt.emoji && <span className="text-base">{opt.emoji}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
