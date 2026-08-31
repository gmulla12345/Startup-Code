"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StepInterests } from "@/components/onboarding/step-interests";
import { StepPersonality } from "@/components/onboarding/step-personality";
import { StepPreferences } from "@/components/onboarding/step-preferences";
import { StepGoals } from "@/components/onboarding/step-goals";
import { emptyPersonality, defaultPreferences } from "@/lib/repositories/profile";
import type { InterestTag, LifestyleGoal, PersonalitySliders, Profile, UserPreferences } from "@/types/database";

type Tab = "basics" | "interests" | "personality" | "preferences" | "goals";

export default function EditProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("basics");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<InterestTag[]>([]);
  const [personality, setPersonality] = useState<PersonalitySliders>(emptyPersonality());
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences());
  const [goals, setGoals] = useState<LifestyleGoal[]>([]);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then(({ profile }: { profile: Profile }) => {
        setFirstName(profile.firstName);
        setCity(profile.city ?? "");
        setInterests(profile.interests);
        setPersonality(profile.personality);
        setPreferences(profile.preferences);
        setGoals(profile.lifestyleGoals);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, city, interests, personality, preferences, lifestyleGoals: goals }),
      });
      if (!res.ok) throw new Error("Failed to save.");
      toast.success("Profile updated.");
      router.push("/profile");
      router.refresh();
    } catch {
      toast.error("Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-foreground-muted mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>

      <h1 className="font-display text-2xl font-semibold text-foreground mb-6">Edit your profile</h1>

      <Tabs
        className="mb-6 flex-wrap"
        value={tab}
        onChange={setTab}
        options={[
          { value: "basics", label: "Basics" },
          { value: "interests", label: "Interests" },
          { value: "personality", label: "Personality" },
          { value: "preferences", label: "Preferences" },
          { value: "goals", label: "Goals" },
        ]}
      />

      <div className="min-h-[320px]">
        {tab === "basics" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">First name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">City</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
        )}
        {tab === "interests" && <StepInterests selected={interests} onChange={setInterests} />}
        {tab === "personality" && <StepPersonality value={personality} onChange={setPersonality} />}
        {tab === "preferences" && <StepPreferences value={preferences} onChange={setPreferences} />}
        {tab === "goals" && <StepGoals selected={goals} onChange={setGoals} />}
      </div>

      <div className="flex justify-end mt-8 pt-6 border-t border-border">
        <Button size="lg" onClick={handleSave} loading={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
