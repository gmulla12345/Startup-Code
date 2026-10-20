export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-colors"
          // Done steps are drawn in the brand gradient (the landing page's, as a small signature).
          style={{
            background: i <= step ? "linear-gradient(90deg, var(--brand-orange), var(--brand-pink))" : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}
