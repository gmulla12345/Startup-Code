"use client";

import { ChipSelect } from "./chip-select";
import { INTERESTS } from "@/lib/config/taxonomy";
import type { InterestTag } from "@/types/database";

export function StepInterests({
  selected,
  onChange,
}: {
  selected: InterestTag[];
  onChange: (interests: InterestTag[]) => void;
}) {
  function toggle(value: InterestTag) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div>
      <p className="text-sm text-foreground-muted mb-4">Pick as many as you like — the more, the better.</p>
      <ChipSelect options={INTERESTS} selected={selected} onToggle={toggle} />
    </div>
  );
}
