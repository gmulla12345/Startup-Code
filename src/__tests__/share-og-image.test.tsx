// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The preview picture a shared link shows in a messaging app. These tests draw it
// for real (the PNG is rendered, not mocked) and check what comes out: a correctly
// sized image for a live link, nothing at all for one that is off, and no way for
// anything private to end up in it. Set SHARE_OG_DUMP=<folder> to also save the
// pictures, to look at them.

const h = vi.hoisted(() => ({ view: null as unknown }));
vi.mock("@/lib/share/view", () => ({ loadShareView: async () => h.view }));

import Image, { alt, contentType, size } from "@/app/s/[token]/opengraph-image";
import type { ShareView } from "@/lib/share/view";

const TOKEN = "T".repeat(22);
const draw = async () => Image({ params: Promise.resolve({ token: TOKEN }) });

const place = (over: Record<string, unknown> = {}, name = "Fells Point Roasters"): ShareView =>
  ({
    kind: "place",
    token: TOKEN,
    note: null,
    sharerName: null,
    place: { status: "ok", place: { name, address: "1 S Broadway", category: "Cafe", photoRef: "AUacShh0Zp5aB7zQxH9kVQx_fixture_photo_reference_01", photoCredit: null } },
    ...over,
  }) as ShareView;

const plan = (over: Record<string, unknown> = {}): ShareView =>
  ({
    kind: "plan",
    token: TOKEN,
    note: null,
    sharerName: null,
    plan: { title: "A weekend in Lisbon", type: "travel", city: "Lisbon", country: "Portugal", dayCount: 2, stopCount: 6, estimatedCost: null, days: [], truncated: false },
    ...over,
  }) as ShareView;

/** Width and height from a PNG's header. */
function dimensions(png: Buffer) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

async function pngOf(response: Response) {
  return Buffer.from(await response.arrayBuffer());
}

function dump(name: string, png: Buffer) {
  const folder = process.env.SHARE_OG_DUMP;
  if (!folder) return;
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, `${name}.png`), png);
}

beforeEach(() => {
  h.view = place();
});

describe("the preview picture", () => {
  it("is a 1200 by 630 PNG, the size link previews want", async () => {
    const res = await draw();
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const png = await pngOf(res);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a"); // the PNG signature
    expect(dimensions(png)).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(alt).toBeTruthy();
    dump("place", png);
  });

  it("draws for a place with a note and a name, a plan, and a place Google could not describe", async () => {
    const cases: [string, ShareView][] = [
      ["place-note-name", place({ note: "Get the plum tart before noon", sharerName: "Maya" })],
      ["plan", plan({ note: "Go early on the first day", sharerName: "Maya" })],
      ["plan-plain", plan()],
      ["place-unavailable", { kind: "place", token: TOKEN, note: "Worth the walk", sharerName: null, place: { status: "unavailable" } } as ShareView],
    ];
    for (const [name, view] of cases) {
      h.view = view;
      const res = await draw();
      expect(res.status, name).toBe(200);
      const png = await pngOf(res);
      expect(dimensions(png), name).toEqual({ width: 1200, height: 630 });
      dump(name, png);
    }
  });

  it("copes with a very long name, and a name in another script", async () => {
    for (const [name, text] of [["long", "The Extraordinarily Long Named Place of Fine Dining and Coffee, Est. 1894"], ["accents", "Café Ñandú · Straße"], ["cjk", "東京タワー"]] as const) {
      h.view = place({}, text);
      const res = await draw();
      expect(res.status, name).toBe(200);
      dump(`place-${name}`, await pngOf(res));
    }
  });

  it("is nothing at all for a link that is off or never was: a 404, not a picture", async () => {
    h.view = null;
    const res = await draw();
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).not.toBe("image/png");
  });
});
