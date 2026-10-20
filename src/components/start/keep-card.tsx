import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FIRST_LIST_SRC } from "@/lib/config/start";
import { cn } from "@/lib/utils/cn";

/**
 * Why we ask for an account here, and only here: to keep what the visitor was given.
 * It is a card under the list, not a wall: the list stays on screen and nothing is
 * taken away if they say no. The same card answers the three moments an account is
 * needed (keeping the list, keeping one place, starting a second list), each with its
 * own words.
 */

export type KeepReason = "list" | "place" | "another";

// COPY: what the card says for each of the three moments
const WORDS: Record<KeepReason, { title: string; body: string }> = {
  list: { title: "Keep this list", body: "Make an account and this list stays with you." },
  place: { title: "Keep this place", body: "Make an account and it is saved for you, with the rest of your list." },
  another: { title: "Another list", body: "This first list is yours to keep. Make an account to start another." },
};

export function KeepCard({ reason, attention }: { reason: KeepReason; attention: boolean }) {
  const words = WORDS[reason];
  return (
    <section
      id="keep"
      aria-live="polite"
      className={cn(
        "rounded-[var(--radius-lg)] border bg-surface p-5 shadow-[var(--shadow-card)] transition-colors sm:p-6",
        attention ? "border-primary" : "border-border"
      )}
    >
      <h2 className="font-display text-xl font-semibold text-foreground">{words.title}</h2>
      <p className="mt-1 text-foreground-muted">{words.body}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg" className="w-full sm:w-auto">
          {/* Carries where the visitor came from, so signups can be traced to first lists. */}
          {/* COPY: the buttons on the card */}
          <Link href={`/signup?src=${FIRST_LIST_SRC}`}>Create an account</Link>
        </Button>
        <Link href="/login" className="text-center text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">
          Log in
        </Link>
      </div>
    </section>
  );
}
