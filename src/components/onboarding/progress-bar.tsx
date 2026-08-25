export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-colors"
          style={{ background: i <= step ? "var(--ember)" : "var(--border)" }}
        />
      ))}
    </div>
  );
}
