// A soft, blurred radial-gradient glow used as a decorative background
// layer behind a section's content -- the same "colored aurora behind
// otherwise-flat content" technique Stripe's marketing site leans on, tuned
// down to Zolo's own ember/gold/forest palette instead of Stripe's rainbow.
// Purely decorative (aria-hidden), absolutely positioned behind a `relative`
// section, never intercepts clicks. `tone` picks which brand color; `side`
// picks which corner it anchors to, so consecutive sections don't all glow
// from the same spot and start to feel repetitive.
const TONES = {
  ember: "radial-gradient(circle, rgba(255,106,69,0.16) 0%, rgba(255,106,69,0) 70%)",
  gold: "radial-gradient(circle, rgba(240,188,78,0.14) 0%, rgba(240,188,78,0) 70%)",
  forest: "radial-gradient(circle, rgba(63,174,145,0.14) 0%, rgba(63,174,145,0) 70%)",
} as const;

const POSITIONS = {
  "top-left": "-top-1/4 -left-1/4",
  "top-right": "-top-1/4 -right-1/4",
  "bottom-left": "-bottom-1/4 -left-1/4",
  "bottom-right": "-bottom-1/4 -right-1/4",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
} as const;

export function SectionGlow({
  tone = "ember",
  side = "top-right",
  size = "w-[36rem] h-[36rem]",
}: {
  tone?: keyof typeof TONES;
  side?: keyof typeof POSITIONS;
  size?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${POSITIONS[side]} ${size} rounded-full blur-3xl animate-glow-drift`}
      style={{ background: TONES[tone] }}
    />
  );
}
