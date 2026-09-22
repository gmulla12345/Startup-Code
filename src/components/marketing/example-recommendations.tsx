import type { Experience } from "@/types/database";
import { ExperienceCard } from "@/components/experience/experience-card";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";

export function ExampleRecommendations({ experiences }: { experiences: Experience[] }) {
  if (experiences.length === 0) return null;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Real places"
            title="A taste of what you'll get"
            subtitle="Real, live places — sign up and we'll match them (and thousands more) to your actual interests."
            className="mb-10"
          />
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.slice(0, 3).map((exp, i) => (
            <Reveal key={exp.id} delay={i * 0.08}>
              <div className="pointer-events-none">
                <ExperienceCard experience={exp} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
