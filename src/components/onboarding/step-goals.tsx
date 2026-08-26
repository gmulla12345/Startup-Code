"use client";

import { ChipSelect } from "./chip-select";
import { LIFESTYLE_GOALS } from "@/lib/config/taxonomy";
import { brand } from "@/lib/config/brand";
import type { LifestyleGoal } from "@/types/database";

export function StepGoals({
  selected,
  onChange,
}: {
  selected: LifestyleGoal[];
  onChange: (goals: LifestyleGoal[]) => void;
}) {
  function toggle(value: LifestyleGoal) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div>
      <p className="text-sm text-foreground-muted mb-4">What are you hoping {brand.name} helps you do more of?</p>
      <ChipSelect options={LIFESTYLE_GOALS} selected={selected} onToggle={toggle} columns={1} />
    </div>
  );
}
