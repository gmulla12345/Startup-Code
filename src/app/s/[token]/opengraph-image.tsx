import { ImageResponse } from "next/og";
import { brand } from "@/lib/config/brand";
import { describeShare } from "@/lib/share/copy";
import { loadShareView } from "@/lib/share/view";

/**
 * The picture a link shows in iMessage, GroupMe, Instagram and the rest: drawn
 * here, not taken from anywhere. It carries only words and our name. Never a
 * Google photo (rehosting or re-cropping one is not ours to do), never a map,
 * never a person's face, and the sharer's name only if they ticked the box (it
 * comes from the same view as the page).
 *
 * Reused for an hour like the page, and dropped with it when the link is turned
 * off. `revalidate` must be a literal; a test keeps it equal to SHARE_CACHE_SECONDS.
 */
export const revalidate = 3600;
// Drawn on demand for the first request to a link and then reused (like the page),
// not at build time, and not again for every preview crawler that asks.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}
export const alt = "A place or plan shared on Zolo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1b1712";
const MUTED = "#6b6255";
const EMBER = "#ff4e2b";
const PAPER = "#faf7f2";
const RULE = "#e8e1d4";

const clip = (text: string, max: number) => {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
};

/** Longer titles get smaller type so they fit in a few lines instead of running off the card. */
const titleSize = (title: string) => (title.length <= 24 ? 96 : title.length <= 44 ? 80 : title.length <= 70 ? 64 : 52);

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await loadShareView(token);
  // A link that is off and one that never existed look the same: no picture.
  if (!view) return new Response(null, { status: 404 });

  const copy = describeShare(view);
  const title = clip(copy.title, 90);
  const note = view.note ? clip(`“${view.note}”`, 110) : null;
  const byline = view.sharerName ? `Shared by ${view.sharerName}` : null;
  const showsGoogleName = view.kind === "place" && view.place.status === "ok";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "64px 72px",
          color: INK,
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
          {brand.name}
          <span style={{ color: EMBER }}>.</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: MUTED }}>
            {copy.eyebrow}
          </div>
          <div style={{ display: "flex", marginTop: 20, fontSize: titleSize(title), fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>
            {title}
          </div>
          {copy.detail && (
            <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: MUTED }}>{clip(copy.detail, 80)}</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `2px solid ${RULE}`, paddingTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            {note && <div style={{ display: "flex", fontSize: 28, lineHeight: 1.3 }}>{note}</div>}
            {byline && <div style={{ display: "flex", marginTop: note ? 10 : 0, fontSize: 24, color: MUTED }}>{byline}</div>}
            {showsGoogleName && (
              <div style={{ display: "flex", marginTop: note || byline ? 10 : 0, fontSize: 20, color: MUTED }}>Powered by Google</div>
            )}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: MUTED }}>{brand.domain.replace(/^https?:\/\//, "")}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
