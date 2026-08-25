"use client";

import { cn } from "@/lib/utils/cn";

export function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-4 py-2 rounded-full border text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-forest text-white border-forest"
              : "border-border-strong text-foreground hover:bg-surface-sunken"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
