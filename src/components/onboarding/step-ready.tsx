import { Sparkles } from "lucide-react";

export function StepReady({ firstName }: { firstName: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <div className="h-16 w-16 rounded-full bg-[var(--ember-soft)] flex items-center justify-center mb-6 animate-pulse">
        <Sparkles className="h-7 w-7 text-ember" />
      </div>
      <h2 className="font-display text-3xl font-semibold text-foreground">Your world is ready{firstName ? `, ${firstName}` : ""}.</h2>
      <p className="text-foreground-muted mt-3 max-w-xs">
        We&apos;re building your first set of personalized recommendations now.
      </p>
    </div>
  );
}
