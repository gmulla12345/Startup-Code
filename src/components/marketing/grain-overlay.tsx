// A single static, tiled noise texture over the whole pre-login site --
// the thing that separates a flat CSS gradient from something that looks
// shot on film. Deliberately subtle (2% opacity) and static, not animated
// per-frame: real grain doesn't need motion to read as texture, and a
// per-frame-regenerated noise field is a genuine (if small) paint cost for
// zero visible benefit at this opacity. Inline SVG data URI, not an image
// asset, so there's no extra network request and it can never 404.
const NOISE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] opacity-[0.025] mix-blend-overlay"
      style={{ backgroundImage: `url("${NOISE_SVG}")` }}
    />
  );
}
