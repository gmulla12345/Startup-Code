import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";

// The not-found page for everything inside the (app) layout: a place or plan that
// does not exist, or a link that has gone. The layout already provides the page's
// chrome (the app's sidebar when signed in, a light header when not), so this is
// only the message. The site-wide not-found page brings the marketing header and
// footer with it, which here made two sets of navigation on one page.
export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: true },
  alternates: {},
};

export default async function AppNotFound() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="ring-brand mx-auto mb-6 inline-block">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
          <Compass className="h-6 w-6 text-primary" />
        </span>
      </div>
      <h1 className="font-display text-3xl font-semibold text-foreground mb-3">We could not find that</h1>
      <p className="text-foreground-muted mb-8">It may have moved, or the link may be out of date.</p>
      <Button asChild size="lg">
        <Link href={user ? "/home" : "/"}>
          Back to home <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
