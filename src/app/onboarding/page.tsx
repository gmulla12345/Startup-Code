"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { OnboardingProgress } from "@/components/onboarding/progress-bar";
import { StepBasics, type BasicsData } from "@/components/onboarding/step-basics";
import { StepInterests } from "@/components/onboarding/step-interests";
import { StepPersonality } from "@/components/onboarding/step-personality";
import { StepPreferences } from "@/components/onboarding/step-preferences";
import { StepGoals } from "@/components/onboarding/step-goals";
import { StepReady } from "@/components/onboarding/step-ready";
import { emptyPersonality, defaultPreferences } from "@/lib/repositories/profile";
import { analyticsEvents } from "@/services/analytics/track";
import { brand } from "@/lib/config/brand";
import type { InterestTag, LifestyleGoal, PersonalitySliders, UserPreferences } from "@/types/database";

const STEPS = ["basics", "interests", "personality", "preferences", "goals"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [basics, setBasics] = useState<BasicsData>({
    firstName: "",
    ageRange: "",
    city: "",
    region: null,
    country: null,
    latitude: null,
    longitude: null,
  });
  const [interests, setInterests] = useState<InterestTag[]>([]);
  const [personality, setPersonality] = useState<PersonalitySliders>(emptyPersonality());
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences());
  const [goals, setGoals] = useState<LifestyleGoal[]>([]);

  const step = STEPS[stepIndex];

  const canContinue = {
    basics: basics.firstName.trim().length > 0 && basics.ageRange !== "" && basics.city.trim().length > 0,
    interests: interests.length > 0,
    personality: true,
    preferences: true,
    goals: true,
  }[step];

  async function handleFinish() {
    setSubmitting(true);
    try {
      const patchRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: basics.firstName,
          ageRange: basics.ageRange,
          city: basics.city,
          region: basics.region,
          country: basics.country,
          latitude: basics.latitude,
          longitude: basics.longitude,
          interests,
          personality,
          preferences,
          lifestyleGoals: goals,
        }),
      });

      if (!patchRes.ok) throw new Error("Failed to save your profile.");

      const completeRes = await fetch("/api/onboarding/complete", { method: "POST" });
      if (!completeRes.ok) throw new Error("Failed to complete onboarding.");

      analyticsEvents.onboardingCompleted();
      setDone(true);
      setTimeout(() => {
        router.push("/home");
        router.refresh();
      }, 1800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (stepIndex === STEPS.length - 1) {
      handleFinish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <StepReady firstName={basics.firstName} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5">
        <Logo />
      </header>

      <main className="flex-1 flex items-start justify-center px-6 pb-12">
        <div className="w-full max-w-lg pt-4">
          <OnboardingProgress step={stepIndex} total={STEPS.length} />

          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-1">
            {step === "basics" && "Let's get to know you"}
            {step === "interests" && "What do you love?"}
            {step === "personality" && "How would you describe yourself?"}
            {step === "preferences" && "Your ideal experience"}
            {step === "goals" && `What are you hoping to get out of ${brand.name}?`}
          </h1>
          <p className="text-foreground-muted mb-8">
            {step === "basics" && "This helps us tailor everything that follows."}
            {step === "interests" && "We'll use these to shape your first recommendations."}
            {step === "personality" && "There are no wrong answers — just be honest."}
            {step === "preferences" && "Tell us how you like to spend your time."}
            {step === "goals" && "Pick as many as apply."}
          </p>

          <div className="min-h-[320px]">
            {step === "basics" && <StepBasics data={basics} onChange={setBasics} />}
            {step === "interests" && <StepInterests selected={interests} onChange={setInterests} />}
            {step === "personality" && <StepPersonality value={personality} onChange={setPersonality} />}
            {step === "preferences" && <StepPreferences value={preferences} onChange={setPreferences} />}
            {step === "goals" && <StepGoals selected={goals} onChange={setGoals} />}
          </div>

          <div className="flex items-center justify-between mt-10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className={stepIndex === 0 ? "invisible" : ""}
            >
              Back
            </Button>
            <Button type="button" size="lg" onClick={handleNext} disabled={!canContinue || submitting}>
              {submitting ? "Saving..." : stepIndex === STEPS.length - 1 ? "Finish" : "Continue"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
