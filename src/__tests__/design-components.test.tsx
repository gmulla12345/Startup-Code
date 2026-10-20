import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The small pieces that make the inside Zolo's own: the match ring, the avatar ring,
// and a not-found page that is only a message (the layout around it supplies the chrome).

const h = vi.hoisted(() => ({ user: null as null | { id: string } }));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: async () => h.user }));
vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; width: number; height: number; className?: string; style?: object }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} width={props.width} height={props.height} className={props.className} style={props.style} />
  ),
}));

import { MatchBadge } from "@/components/experience/match-badge";
import { Avatar } from "@/components/ui/avatar";
import AppNotFound from "@/app/(app)/not-found";

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("the match badge", () => {
  it("says the score in words, and draws it as a ring filled to that point", () => {
    const out = html(<MatchBadge score={93} />);
    expect(out).toContain("93% match");
    expect(out).toContain("match-ring");
    expect(out).toContain("--p:93");
  });

  it("rounds, and keeps the ring within 0 to 100 however odd the score", () => {
    expect(html(<MatchBadge score={83.6} />)).toContain("84% match");
    expect(html(<MatchBadge score={140} />)).toContain("100% match");
    expect(html(<MatchBadge score={140} />)).toContain("--p:100");
    expect(html(<MatchBadge score={-5} />)).toContain("0% match");
  });

  it("leaves the ring to the eyes: it is hidden from screen readers, the words carry the meaning", () => {
    expect(html(<MatchBadge score={50} />)).toMatch(/class="match-ring[^"]*"[^>]*aria-hidden="true"/);
  });

  it("sits on its own white chip, so it reads on any photograph", () => {
    expect(html(<MatchBadge score={50} />)).toContain("bg-white/95");
  });
});

describe("the avatar", () => {
  it("shows initials in navy inside a thin brand-gradient ring", () => {
    const out = html(<Avatar name="Maya Rivera" size={40} />);
    expect(out).toContain("ring-brand");
    expect(out).toContain("MR");
    expect(out).toContain("bg-foreground");
  });

  it("shows a photo inside the same ring, sized to fit within it", () => {
    const out = html(<Avatar name="Maya" src="https://example.com/m.jpg" size={40} />);
    expect(out).toContain("ring-brand");
    expect(out).toContain('src="https://example.com/m.jpg"');
    expect(out).toMatch(/width:\s*36px/);
  });

  it("copes with no name", () => {
    expect(html(<Avatar name="" />)).toContain("?");
  });
});

describe("the not-found page inside the app", () => {
  beforeEach(() => {
    h.user = null;
  });

  it("is only a message: no second header or footer of its own", async () => {
    const out = html(await AppNotFound());
    expect(out).toContain("We could not find that");
    expect(out).not.toMatch(/<header|<footer|<nav/);
  });

  it("leads a signed-in person back to their home, and a visitor to the front page", async () => {
    h.user = { id: "u1" };
    expect(html(await AppNotFound())).toContain('href="/home"');
    h.user = null;
    expect(html(await AppNotFound())).toContain('href="/"');
  });

  it("keeps to the brand voice: calm, no exclamation points", async () => {
    expect(html(await AppNotFound())).not.toContain("!");
  });
});
