import { ImageResponse } from "next/og";
import { brand } from "@/lib/config/brand";
import { LIST_TIMEZONE } from "@/lib/config/lists";
import { getPublicList } from "@/lib/lists/store";
import { todayIn, windowState } from "@/lib/lists/window";

/**
 * The picture a shared list shows in iMessage, GroupMe, Instagram and the rest: drawn
 * here, not taken from anywhere. It carries only our own words (the list's title and
 * how many places it holds) and our name. Never a Google photo (rehosting or
 * re-cropping one is not ours to do), never a place name, never a map, never a person (the one exception: the first name of its maker, when they made the list public and chose to show it).
 * Because it holds no Google data, drawing it makes no Google call at all.
 *
 * Reused for an hour like the page, and dropped with it when the list is turned off.
 * `revalidate` must be a literal; a test keeps it equal to LIST_CACHE_SECONDS.
 */
export const revalidate = 3600;
// Drawn on demand for the first request to a link and then reused (like the page),
// not at build time, and not again for every preview crawler that asks.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}
export const alt = "A list of places shared on Zolo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0a2540";
const MUTED = "#425466";
const TEAL = "#0f766e";
const PAPER = "#ffffff";

const clip = (text: string, max: number) => {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
};

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const list = await getPublicList(token);
  // A list that is off and one that never existed look the same: no picture.
  const state = list ? windowState(list, todayIn(LIST_TIMEZONE)) : "upcoming";
  if (!list || state === "upcoming") return new Response(null, { status: 404 });

  const title = clip(list.title, 60);
  // COPY: the small line under the title on a shared list's preview image (and when the list is over)
  const detail = state === "ended" ? "This list has ended" : list.author ? `${list.placeIds.length} places, by ${list.author}` : `${list.placeIds.length} places`;

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
          <span style={{ color: TEAL }}>.</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* COPY: the small line above the title on a shared list's preview image */}
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: MUTED }}>A list</div>
          <div style={{ display: "flex", marginTop: 20, fontSize: title.length <= 24 ? 104 : 80, fontWeight: 700, lineHeight: 1.06, letterSpacing: -2 }}>{title}</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: MUTED }}>{detail}</div>
        </div>

        <div style={{ display: "flex", height: 6, width: 160, background: TEAL }} />
      </div>
    ),
    { ...size }
  );
}
