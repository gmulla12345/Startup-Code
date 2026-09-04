"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PillGroup } from "@/components/onboarding/pill-group";
import { ChipSelect } from "@/components/onboarding/chip-select";
import { BUDGET_LEVELS, INTERESTS } from "@/lib/config/taxonomy";
import type { WeekendPlan, WeekendPlanRequest } from "@/types/ai";
import type { InterestTag } from "@/types/database";

export function WeekendPlanner({ isPremium }: { isPremium: boolean }) {
  const [request, setRequest] = useState<WeekendPlanRequest>({
    budgetLevel: "medium",
    days: ["saturday"],
    socialMode: "solo",
    energyLevel: "medium",
    interests: [],
  });
  const [plan, setPlan] = useState<WeekendPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleDay(day: WeekendPlanRequest["days"][number]) {
    setRequest((r) => ({
      ...r,
      days: r.days.includes(day) ? r.days.filter((d) => d !== day) : [...r.days, day],
    }));
  }

  function toggleInterest(value: InterestTag) {
    setRequest((r) => ({
      ...r,
      interests: r.interests.includes(value) ? r.interests.filter((i) => i !== value) : [...r.interests, value],
    }));
  }

  async function generate() {
    if (!isPremium) {
      toast.error("The AI Weekend Planner is a Premium feature.");
      return;
    }
    setLoading(true);
    setPlan(null);
    try {
      const res = await fetch("/api/ai/weekend-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't build a plan.");
      setPlan(json.plan);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function savePlan() {
    if (!plan) return;
    setSaving(true);
    try {
      const res = await fetch("/api/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "My Weekend Plan", plan }),
      });
      if (!res.ok) throw new Error("Failed to save.");
      toast.success("Saved to your Trips.");
    } catch {
      toast.error("Couldn't save this plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-ember" />
        <h2 className="font-display text-xl font-semibold text-foreground">Plan My Weekend</h2>
        {!isPremium && <span className="text-xs bg-[var(--gold-soft)] text-[color:var(--gold)] px-2 py-0.5 rounded-full font-medium">Premium</span>}
      </div>

      {!plan && (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Which days?</label>
            <div className="flex flex-wrap gap-2">
              {(["friday_evening", "saturday", "sunday"] as const).map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium ${
                    request.days.includes(day) ? "bg-forest text-white border-forest" : "border-border-strong text-foreground"
                  }`}
                >
                  {day === "friday_evening" ? "Friday evening" : day[0].toUpperCase() + day.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Budget</label>
            <PillGroup
              options={BUDGET_LEVELS.filter((b) => b.value !== "luxury")}
              value={request.budgetLevel}
              onChange={(budgetLevel) => setRequest((r) => ({ ...r, budgetLevel }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Solo or group?</label>
            <PillGroup
              options={[
                { value: "solo", label: "Solo" },
                { value: "group", label: "Group" },
              ]}
              value={request.socialMode}
              onChange={(socialMode) => setRequest((r) => ({ ...r, socialMode }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Energy level</label>
            <PillGroup
              options={[
                { value: "low", label: "Relaxed" },
                { value: "medium", label: "Balanced" },
                { value: "high", label: "Packed" },
              ]}
              value={request.energyLevel}
              onChange={(energyLevel) => setRequest((r) => ({ ...r, energyLevel }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Focus on (optional)</label>
            <ChipSelect
              options={INTERESTS.slice(0, 9)}
              selected={request.interests as InterestTag[]}
              onToggle={toggleInterest}
            />
          </div>

          <Button size="lg" className="w-full" onClick={generate} loading={loading} disabled={request.days.length === 0}>
            {loading ? "Building your weekend..." : "Generate Plan"}
          </Button>
        </div>
      )}

      {plan && (
        <div className="space-y-5">
          <p className="text-sm text-foreground-muted italic">{plan.summary}</p>
          <div className="space-y-3">
            {plan.items.map((item, i) => (
              <div key={i} className="flex gap-4 items-start">
                <span className="text-sm font-medium text-foreground-muted w-16 shrink-0 pt-0.5">{item.startTime}</span>
                <div className="flex-1 border-l-2 border-border pl-4 pb-3">
                  <p className="text-xs uppercase tracking-wide text-foreground-subtle mb-0.5">{item.day.replace("_", " ")}</p>
                  <p className="font-medium text-foreground">{item.title}</p>
                  {item.notes && <p className="text-sm text-foreground-muted mt-0.5">{item.notes}</p>}
                  {item.estimatedCost != null && item.estimatedCost > 0 && (
                    <p className="text-xs text-foreground-subtle mt-0.5">${item.estimatedCost}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setPlan(null)} className="flex-1">
              Start over
            </Button>
            <Button onClick={savePlan} loading={saving} className="flex-1">
              {saving ? "Saving..." : "Save Plan"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
