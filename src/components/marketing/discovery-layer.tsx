import { ArrowRight } from "lucide-react";
import { brand } from "@/lib/config/brand";
import { Reveal } from "@/components/marketing/reveal";

// Directly addresses an outside AI review's framing of Zolo as "a discovery
// tool rather than an all-in-one booking platform" as if that were a
// limitation -- owning it as the actual product positioning instead. The
// three-step strip makes "it sits before them" literal: decide here, confirm
// there, book wherever you like.
const FLOW = ["Decide with Zolo", "Confirm hours and details", "Book where you like"];

export function DiscoveryLayer() {
  return (
    <section className="relative overflow-hidden border-t border-border bg-surface-sunken text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-[#ff9a76]/20 blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-28">
        <Reveal>
          <p className="mb-6 text-sm font-semibold text-primary">Positioning</p>
          <h2 className="font-display text-3xl font-semibold leading-[1.2] tracking-tight text-foreground sm:text-4xl">
            {brand.name} doesn&apos;t replace Google Maps, Tripadvisor, or your favorite booking app.
            <span className="text-foreground-muted"> It sits before them</span> — helping you decide what&apos;s
            worth your time, then sending you to the right place to confirm details, check hours, or book.
          </h2>

          <ol className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-2">
            {FLOW.map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <span className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)]">
                  <span className="mr-2 text-primary">{i + 1}</span>
                  {label}
                </span>
                {i < FLOW.length - 1 && (
                  <ArrowRight aria-hidden className="hidden h-4 w-4 text-foreground-subtle sm:block" />
                )}
              </li>
            ))}
          </ol>

          <p className="mx-auto mt-10 max-w-xl text-lg italic leading-relaxed text-foreground-muted">
            &quot;The friend who knows your taste and says, &apos;You&apos;d love this place — here&apos;s why.&apos;
            The rest is up to you.&quot;
          </p>
        </Reveal>
      </div>
    </section>
  );
}
