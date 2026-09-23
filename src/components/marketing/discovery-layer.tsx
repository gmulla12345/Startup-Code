import { brand } from "@/lib/config/brand";
import { SectionGlow } from "@/components/marketing/section-glow";
import { Reveal } from "@/components/marketing/reveal";

// Directly addresses an outside AI review's framing of Zolo as "a discovery
// tool rather than an all-in-one booking platform" as if that were a
// limitation — owning it as the actual product positioning instead.
export function DiscoveryLayer() {
  return (
    <section className="relative overflow-hidden bg-background border-t border-border text-center">
      <SectionGlow tone="forest" side="center" size="w-[42rem] h-[42rem]" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 py-20 md:py-28">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ember mb-6">Positioning</p>
          <h2 className="font-display text-3xl sm:text-4xl font-medium text-foreground leading-snug tracking-tight mb-6">
            {brand.name} doesn&apos;t replace Google Maps, Tripadvisor, or your favorite booking app.
            <span className="text-foreground-muted"> It sits before them</span> — helping you decide what&apos;s
            worth your time, then sending you to the right place to confirm details, check hours, or book.
          </h2>
          <p className="text-foreground-muted text-lg italic font-display">
            &quot;The friend who knows your taste and says, &apos;You&apos;d love this place — here&apos;s why.&apos;
            The rest is up to you.&quot;
          </p>
        </Reveal>
      </div>
    </section>
  );
}
