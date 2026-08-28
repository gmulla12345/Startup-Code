import type { Experience } from "@/types/database";
import { ExperienceCard } from "@/components/experience/experience-card";

export function ExampleRecommendations({ experiences }: { experiences: Experience[] }) {
  if (experiences.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28 border-t border-border">
      <div className="max-w-2xl mb-10">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">
          A taste of what you&apos;ll get
        </h2>
        <p className="mt-4 text-foreground-muted text-lg">
          Real experiences, matched to a real profile — this is what your feed could look like.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {experiences.slice(0, 3).map((exp, i) => (
          <div key={exp.id} className="pointer-events-none">
            <ExperienceCard
              experience={exp}
              matchScore={[94, 88, 91][i]}
              reasoning={
                [
                  "You're into outdoor adventure and photography. This combines both.",
                  "You said you're into nightlife and music — this hidden gem is exactly your scene.",
                  "Matches your interest in wellness — a full reset day built around it.",
                ][i]
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
