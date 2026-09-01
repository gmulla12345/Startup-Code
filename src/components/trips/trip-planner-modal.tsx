"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PillGroup } from "@/components/onboarding/pill-group";
import { ChipSelect } from "@/components/onboarding/chip-select";
import { INTERESTS } from "@/lib/config/taxonomy";
import type { InterestTag } from "@/types/database";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TripPlannerModal({
  destinationCity,
  destinationCountry,
  destinationLatitude,
  destinationLongitude,
  isPremium,
}: {
  destinationCity: string;
  destinationCountry: string;
  destinationLatitude: number;
  destinationLongitude: number;
  isPremium: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetLevel, setBudgetLevel] = useState("medium");
  const [socialMode, setSocialMode] = useState<"solo" | "group">("solo");
  const [energyLevel, setEnergyLevel] = useState<"low" | "medium" | "high">("medium");
  const [interests, setInterests] = useState<InterestTag[]>([]);

  function toggleInterest(value: InterestTag) {
    setInterests((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function openPlanner() {
    if (!isPremium) {
      toast.error("The AI Trip Planner is a Premium feature.", {
        action: { label: "Upgrade", onClick: () => router.push("/profile/upgrade") },
      });
      return;
    }
    setOpen(true);
  }

  async function generate() {
    if (!startDate || !endDate) {
      toast.error("Pick a start and end date first.");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date has to be after the start date.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/trip-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationCity,
          destinationCountry,
          destinationLatitude,
          destinationLongitude,
          startDate,
          endDate,
          budgetLevel,
          socialMode,
          energyLevel,
          interests,
        }),
      });

      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't build your trip plan.");

      toast.success(`Your ${destinationCity} trip is ready.`);
      setOpen(false);
      router.push(`/trips/${json.itineraryId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={openPlanner} className="shrink-0">
        <Plus className="h-4 w-4" /> Plan a trip to {destinationCity}
        {!isPremium && (
          <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">Premium</span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-surface rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-ember" />
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Plan your {destinationCity} trip
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-surface-sunken shrink-0"
              >
                <X className="h-4 w-4 text-foreground-muted" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Arriving</label>
                  <Input type="date" min={todayISO()} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Leaving</label>
                  <Input type="date" min={startDate || todayISO()} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Budget (per day, per person)</label>
                <PillGroup
                  options={[
                    { value: "free", label: "Free" },
                    { value: "low", label: "Under $75" },
                    { value: "medium", label: "$75–200" },
                    { value: "high", label: "$200+" },
                  ]}
                  value={budgetLevel}
                  onChange={setBudgetLevel}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Solo or group?</label>
                <PillGroup
                  options={[
                    { value: "solo", label: "Solo" },
                    { value: "group", label: "Group" },
                  ]}
                  value={socialMode}
                  onChange={(v) => setSocialMode(v as "solo" | "group")}
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
                  value={energyLevel}
                  onChange={(v) => setEnergyLevel(v as "low" | "medium" | "high")}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Focus on (optional)</label>
                <ChipSelect options={INTERESTS.slice(0, 9)} selected={interests} onToggle={toggleInterest} />
              </div>

              <Button size="lg" className="w-full" onClick={generate} loading={loading}>
                {loading ? "Building your itinerary..." : "Generate Trip Plan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
