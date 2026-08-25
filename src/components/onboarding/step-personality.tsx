"use client";

import { Slider } from "@/components/ui/slider";
import { PERSONALITY_SLIDERS } from "@/lib/config/taxonomy";
import type { PersonalitySliders } from "@/types/database";

export function StepPersonality({
  value,
  onChange,
}: {
  value: PersonalitySliders;
  onChange: (value: PersonalitySliders) => void;
}) {
  return (
    <div className="space-y-8">
      {PERSONALITY_SLIDERS.map((s) => (
        <Slider
          key={s.key}
          leftLabel={s.left}
          rightLabel={s.right}
          value={value[s.key]}
          onChange={(v) => onChange({ ...value, [s.key]: v })}
        />
      ))}
    </div>
  );
}
