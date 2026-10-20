import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { StartFlow } from "@/components/start/start-flow";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * The first list, for someone with no account: two questions, where they are, one
 * personalized list. An account is asked for only to keep what they were given.
 *
 * A signed-in person has no use for it (their Home is made the same way, from more), so
 * they are sent there. The page is not indexed: it is a form, and the list it makes is
 * the visitor's own.
 */
export const metadata: Metadata = {
  title: "Your first list",
  robots: { index: false, follow: true },
};

export default async function StartPage() {
  if (await getCurrentUser()) redirect("/home");

  return (
    // data-own-google-attribution: this page prints its own Google credit under the list, so the floating site-wide badge steps aside (globals.css).
    <div data-own-google-attribution className="glow-page flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Logo />
        <Link href="/login" className="text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">
          Log in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-20 pt-6 sm:px-6">
        {/* COPY: the headline and the line under it */}
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">
          Two questions. <span className="mk-gradient-text whitespace-nowrap">One list.</span>
        </h1>
        <p className="mt-3 mb-10 text-lg text-foreground-muted">No account needed. Tell us what you are after, and where.</p>

        <StartFlow />
      </main>
    </div>
  );
}
