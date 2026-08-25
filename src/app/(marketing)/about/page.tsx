import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Compass, Sparkles, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/config/brand";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--forest-soft),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pt-20 pb-16 text-center">
          <p className="text-sm font-medium text-ember mb-4">Our story</p>
          <h1 className="font-display text-4xl sm:text-6xl font-semibold text-foreground leading-tight">
            Life is made of moments.
            <br />
            We help you find more of them.
          </h1>
          <p className="mt-6 text-lg text-foreground-muted max-w-2xl mx-auto">
            {brand.name} started with a simple frustration: the more options we had for what to do with our time,
            the harder it became to actually do anything. Endless scrolling replaced spontaneity. Fear of missing
            out replaced the joy of just going. We built {brand.name} to fix that.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 space-y-16">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Why we exist</h2>
          <p className="text-foreground-muted leading-relaxed">
            The average person spends hours a week deciding what to do with their free time — and then does
            nothing, because deciding is exhausting. Search engines give you ten thousand results. Social feeds
            give you envy. Neither gives you a plan. We think discovery should feel like a trusted friend making
            a suggestion, not a chore. So we built a platform that actually gets to know you — your interests,
            your budget, your personality, your patterns — and does the deciding with you, not for you to do
            alone.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          <div>
            <div className="h-11 w-11 rounded-full bg-[var(--ember-soft)] flex items-center justify-center mb-4">
              <Compass className="h-5 w-5 text-ember" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Real places, real reasoning</h3>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Every recommendation comes with a reason — never a black box, never a fabricated fact. If we
              don&apos;t know something for certain, we say so.
            </p>
          </div>
          <div>
            <div className="h-11 w-11 rounded-full bg-[var(--forest-soft)] flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5 text-forest" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Built to get sharper</h3>
            <p className="text-sm text-foreground-muted leading-relaxed">
              The platform improves with every save, skip, and trip. It&apos;s not a static list — it&apos;s a
              system that learns who you&apos;re becoming.
            </p>
          </div>
          <div>
            <div className="h-11 w-11 rounded-full bg-[var(--gold-soft)] flex items-center justify-center mb-4">
              <Heart className="h-5 w-5 text-[color:var(--gold)]" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">For people who want more</h3>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Built for young professionals, travelers, and the ambitious — people who know life is short and
              want to spend more of it actually living.
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Where we&apos;re headed</h2>
          <p className="text-foreground-muted leading-relaxed">
            Today, {brand.name} is a personalized discovery engine. Tomorrow, it&apos;s the layer between you and
            everything worth doing in the real world — your travel assistant, your local expert, your nudge to
            get outside, all in one place that actually knows you. We&apos;re early, we&apos;re building fast,
            and we&apos;re just getting started.
          </p>
        </div>

        <div className="relative rounded-[var(--radius-xl)] overflow-hidden">
          <div className="relative aspect-[21/9] w-full">
            <Image
              src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1600&h=680&q=80"
              alt="People exploring outdoors together"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-center px-6">
              <div>
                <p className="font-display text-2xl sm:text-3xl font-semibold text-white mb-4">
                  Ready to experience more?
                </p>
                <Button asChild size="lg">
                  <Link href="/signup">
                    Start Discovering <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
