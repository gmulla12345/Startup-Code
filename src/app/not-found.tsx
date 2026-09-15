import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

// The root not-found boundary — used for any URL that doesn't match a real
// route. Without this file, Next's built-in default 404 page inherits the
// root layout's default title and `alternates.canonical: "/"`, so every
// broken/mistyped URL rendered with the homepage's title and told Google
// its canonical URL was the homepage. `alternates: {}` explicitly clears
// that inherited canonical — a 404 has no correct canonical URL, so it
// should have none rather than a wrong one.
export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
  alternates: {},
};

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <MarketingNav />
      <main className="flex-1 flex items-center justify-center">
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="h-12 w-12 rounded-full bg-[var(--ember-soft)] flex items-center justify-center mx-auto mb-6">
            <Compass className="h-6 w-6 text-ember" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground mb-3">Page not found</h1>
          <p className="text-foreground-muted mb-8">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
          <Button asChild size="lg">
            <Link href="/">
              Back to home <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
