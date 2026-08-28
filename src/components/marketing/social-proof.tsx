const STATS = [
  { value: "20+", label: "curated categories" },
  { value: "Hybrid AI", label: "scoring + reasoning engine" },
  { value: "Worldwide", label: "discovery, anywhere you are" },
];

export function SocialProof() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28 border-t border-border">
      <div className="grid sm:grid-cols-3 gap-8 text-center sm:text-left">
        {STATS.map((s) => (
          <div key={s.label}>
            <div className="font-display text-3xl font-semibold text-foreground">{s.value}</div>
            <div className="text-sm text-foreground-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
