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
          Real, live places — sign up and we&apos;ll match them (and thousands more) to your actual interests.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {experiences.slice(0, 3).map((exp) => (
          <div key={exp.id} className="pointer-events-none">
            <ExperienceCard experience={exp} />
          </div>
        ))}
      </div>
    </section>
  );
}
