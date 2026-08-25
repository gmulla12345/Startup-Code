import type { PersonalitySliders } from "@/types/database";

/**
 * Turns the five personality sliders into a single human-readable label for
 * "Your Experience Profile." Purely derived client-side logic — no AI call
 * needed for something this deterministic.
 */
export function deriveArchetype(p: PersonalitySliders): { label: string; description: string } {
  const { adventurousVsComfortable, quietVsSocial, spontaneousVsPlanned, familiarVsNovel, budgetVsLuxury } = p;

  if (adventurousVsComfortable > 65 && familiarVsNovel > 55) {
    return {
      label: "Adventurous Explorer",
      description: "You seek out the new and the unfamiliar — hidden gems and spontaneous plans are your favorite kind.",
    };
  }
  if (quietVsSocial > 65 && spontaneousVsPlanned < 45) {
    return {
      label: "Social Connector",
      description: "You love bringing people together and rarely need convincing to say yes to plans.",
    };
  }
  if (budgetVsLuxury > 65) {
    return {
      label: "Refined Enthusiast",
      description: "You appreciate quality experiences and don't mind paying for something done well.",
    };
  }
  if (quietVsSocial < 40 && spontaneousVsPlanned < 45) {
    return {
      label: "Thoughtful Planner",
      description: "You like knowing what to expect, and you get more out of experiences when they're well-planned.",
    };
  }
  if (spontaneousVsPlanned > 65) {
    return {
      label: "Free Spirit",
      description: "Plans are more like suggestions to you — you're happiest saying yes on short notice.",
    };
  }
  return {
    label: "Balanced Discoverer",
    description: "You're open to almost anything — a healthy mix of comfort and adventure.",
  };
}
