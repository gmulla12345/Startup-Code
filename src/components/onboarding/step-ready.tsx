"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

// Matches the fixed delay in app/onboarding/page.tsx before it navigates to
// /home, so the bar visually finishes right as the redirect happens.
const READY_DURATION_MS = 1800;

export function StepReady({ firstName }: { firstName: string }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <div className="h-16 w-16 rounded-full bg-[var(--ember-soft)] flex items-center justify-center mb-6 animate-pulse">
        <Sparkles className="h-7 w-7 text-ember" />
      </div>
      <h2 className="font-display text-3xl font-semibold text-foreground">Your world is ready{firstName ? `, ${firstName}` : ""}.</h2>
      <p className="text-foreground-muted mt-3 max-w-xs">
        We&apos;re building your first set of personalized recommendations now.
      </p>
      <div className="w-48 h-1.5 rounded-full bg-[var(--ember-soft)] mt-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-ember"
          style={{
            width: filled ? "100%" : "0%",
            transition: `width ${READY_DURATION_MS}ms ease-out`,
          }}
        />
      </div>
    </div>
  );
}
