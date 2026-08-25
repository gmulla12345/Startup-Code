"use client";

import { PillGroup } from "./pill-group";
import type { UserPreferences } from "@/types/database";

export function StepPreferences({
  value,
  onChange,
}: {
  value: UserPreferences;
  onChange: (value: UserPreferences) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Typical budget</label>
        <PillGroup
          options={[
            { value: "free", label: "Free" },
            { value: "low", label: "$" },
            { value: "medium", label: "$$" },
            { value: "high", label: "$$$" },
            { value: "luxury", label: "$$$$" },
          ]}
          value={value.budgetLevel}
          onChange={(budgetLevel) => onChange({ ...value, budgetLevel })}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">How often do you travel?</label>
        <PillGroup
          options={[
            { value: "rarely", label: "Rarely" },
            { value: "sometimes", label: "Sometimes" },
            { value: "often", label: "Often" },
            { value: "constantly", label: "Constantly" },
          ]}
          value={value.travelFrequency}
          onChange={(travelFrequency) => onChange({ ...value, travelFrequency })}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          How far will you go? <span className="text-foreground-muted font-normal">{value.maxDistanceMiles} mi</span>
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={value.maxDistanceMiles}
          onChange={(e) => onChange({ ...value, maxDistanceMiles: Number(e.target.value) })}
          className="w-full accent-ember"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Indoor or outdoor?</label>
        <PillGroup
          options={[
            { value: "indoor", label: "Indoor" },
            { value: "outdoor", label: "Outdoor" },
            { value: "either", label: "Either" },
          ]}
          value={value.indoorOutdoor}
          onChange={(indoorOutdoor) => onChange({ ...value, indoorOutdoor })}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Solo or group?</label>
        <PillGroup
          options={[
            { value: "solo", label: "Solo" },
            { value: "group", label: "Group" },
            { value: "either", label: "Either" },
          ]}
          value={value.socialMode}
          onChange={(socialMode) => onChange({ ...value, socialMode })}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Best time of day</label>
        <PillGroup
          options={[
            { value: "morning", label: "Morning" },
            { value: "afternoon", label: "Afternoon" },
            { value: "evening", label: "Evening" },
            { value: "night", label: "Night" },
            { value: "any", label: "Any time" },
          ]}
          value={value.timeOfDay}
          onChange={(timeOfDay) => onChange({ ...value, timeOfDay })}
        />
      </div>
    </div>
  );
}
