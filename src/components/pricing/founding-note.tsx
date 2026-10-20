/**
 * What is said about a limited offer, and only when it is true: that the student price is a
 * founding rate whenever it has a limit, and how many spots are left only when the number the
 * owner chose says to show it. No countdown, no urgency words, no number that is not the real one.
 */
export function FoundingNote({ capped, remaining }: { capped: boolean; remaining: number | null }) {
  if (!capped) return null;
  return (
    <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-foreground-muted">
      {/* COPY: what is said about a limited student price */}
      <span className="whitespace-nowrap rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[var(--primary-strong)]">Founding student rate</span>
      {remaining != null && <span className="whitespace-nowrap">{remaining === 1 ? "1 founding spot left" : `${remaining} founding spots left`}</span>}
    </p>
  );
}
