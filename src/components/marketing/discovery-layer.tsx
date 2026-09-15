import { brand } from "@/lib/config/brand";

// Directly addresses an outside AI review's framing of Zolo as "a discovery
// tool rather than an all-in-one booking platform" as if that were a
// limitation — owning it as the actual product positioning instead.
export function DiscoveryLayer() {
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 py-20 md:py-28 border-t border-border text-center">
      <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
        Your discovery layer for real life
      </h2>
      <p className="text-lg text-foreground-muted mb-4">
        {brand.name} doesn&apos;t replace Google Maps, Tripadvisor, or your favorite booking app. It sits before
        them — helping you decide what&apos;s worth your time, then sending you to the right place to confirm
        details, check hours, or book.
      </p>
      <p className="text-foreground-muted">
        Think of {brand.name} as the friend who knows your taste and says, &quot;You&apos;d love this place — here&apos;s
        why.&quot; The rest is up to you.
      </p>
    </section>
  );
}
