import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
      <div className="rounded-[var(--radius-xl)] bg-[linear-gradient(135deg,var(--forest),var(--forest-strong))] px-8 py-16 sm:py-20 text-center">
        <h2 className="font-display text-3xl sm:text-5xl font-semibold text-white max-w-2xl mx-auto leading-tight">
          Stop scrolling. Start experiencing.
        </h2>
        <p className="text-white/80 mt-4 max-w-lg mx-auto text-lg">
          Your next favorite memory is one recommendation away.
        </p>
        <Button asChild size="lg" className="mt-8 bg-white text-forest hover:bg-white/90">
          <Link href="/signup">
            Start Discovering <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
