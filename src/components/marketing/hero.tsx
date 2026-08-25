import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/config/brand";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--forest-soft),transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-1.5 text-xs font-medium text-foreground-muted mb-6">
            <Star className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
            Personalized discovery, built for real life
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.05]">
            {brand.tagline}
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-foreground-muted max-w-xl">
            {brand.subTagline}
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Start Discovering <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">Explore</a>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { src: "photo-1502933691298-84fc14542831", label: "Kayaking" },
            { src: "photo-1554797589-7241bb691973", label: "Izakaya crawl" },
            { src: "photo-1441974231531-c6227db76b6e", label: "Waterfall hike" },
            { src: "photo-1545239351-1141bd82e8a6", label: "Digital art" },
          ].map((img, i) => (
            <div
              key={img.src}
              className="relative aspect-[3/4] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-raised)]"
              style={{ transform: `translateY(${i % 2 === 0 ? "0" : "24px"})` }}
            >
              <Image
                src={`https://images.unsplash.com/${img.src}?auto=format&fit=crop&w=600&h=800&q=80`}
                alt={img.label}
                fill
                sizes="(max-width: 768px) 45vw, 22vw"
                className="object-cover"
                priority={i < 2}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute bottom-3 left-3 text-white text-sm font-medium">{img.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
