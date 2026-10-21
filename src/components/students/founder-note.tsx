/**
 * A short note on why Zolo exists, on the students page. It is unsigned and names no school: the point is the feeling
 * behind it, a student tired of the same three places, not a person to look up. It makes no claim about numbers, users or
 * results, because it says nothing that is not simply true of how it began.
 */
export function FounderNote() {
  return (
    <section aria-labelledby="why-it-exists" className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-xl">
          {/* COPY: why Zolo exists, in the founder's voice, with no name and no school */}
          <h2 id="why-it-exists" className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-subtle">
            Why it exists
          </h2>
          <p className="font-reason mt-4 text-2xl leading-snug text-foreground sm:text-[1.7rem]">
            A college student made Zolo because he was tired of the same three places.
          </p>
          <p className="mt-4 leading-relaxed text-foreground-muted">
            He wanted a short list, chosen with some care, of somewhere he had not been. Zolo is that list.
          </p>
        </div>
      </div>
    </section>
  );
}
