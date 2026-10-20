import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// The whole product, landing page and inside, shares one look defined once on :root
// in globals.css. These tests keep it that way, and protect the contrast the landing
// page was careful to get right: the colors are read from the stylesheet itself, so a
// change to a token that breaks readability fails here rather than in someone's eyes.

const src = join(__dirname, "..");
const css = readFileSync(join(src, "app/globals.css"), "utf-8");

/** The custom properties declared in the first :root block. */
function rootTokens(): Record<string, string> {
  const block = css.match(/:root \{([\s\S]*?)\n\}/)?.[1] ?? "";
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const t = rootTokens();

// WCAG 2.x relative luminance and contrast ratio.
function channel(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
type RGB = [number, number, number];
const rgb = (hex: string): RGB => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
};
const luminance = ([r, g, b]: RGB) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: RGB, b: RGB) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** `fg` laid over `bg` at the given opacity (how text-background/75 on a navy card really renders). */
const over = (fg: RGB, bg: RGB, alpha: number): RGB => fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) as RGB;
const ratio = (fg: string, bg: string) => contrast(rgb(t[fg]), rgb(t[bg]));

describe("one look for the whole product", () => {
  it("is the landing page's palette: a white canvas, deep navy ink, cool grays", () => {
    expect(t.background).toBe("#ffffff");
    expect(t.foreground).toBe("#0a2540");
    expect(t["foreground-muted"]).toBe("#425466");
    expect(t["surface-sunken"]).toBe("#f6f9fc");
    expect(t.border).toBe("#e3e8ee");
  });

  it("is light only: the old warm dark theme, and every way of switching to it, is gone", () => {
    expect(css).toMatch(/color-scheme: light;/);
    expect(css).not.toMatch(/prefers-color-scheme/);
    expect(css).not.toMatch(/data-theme/);
    const layout = readFileSync(join(src, "app/layout.tsx"), "utf-8");
    expect(layout).toMatch(/themeColor: "#ffffff"/);
    expect(layout).not.toMatch(/prefers-color-scheme/);
  });

  it("sets headlines in Inter, keeping the serif for the wordmark and the voice of a recommendation only", () => {
    expect(css).toMatch(/\.font-display \{\s*font-family: var\(--font-sans\)/);
    expect(css).toMatch(/--font-display: var\(--font-inter\)/);
    expect(css).toMatch(/\.font-logo \{\s*font-family: var\(--font-fraunces\)/);
    expect(css).toMatch(/\.font-reason \{\s*font-family: var\(--font-fraunces\)[\s\S]*?font-style: italic/);
  });

  it("keeps the vivid brand colors for decoration: they are named, and no text token uses them", () => {
    for (const name of ["brand-orange", "brand-pink", "brand-gold", "brand-teal", "brand-sky"]) expect(t[name], name).toMatch(/^#[0-9a-f]{6}$/);
    // the text accent is the deeper teal, not the pale gradient teal that white cannot sit on
    expect(t.primary).not.toBe(t["brand-teal"]);
  });

  it("makes the accent a teal, not a red: the owner asked for the red to go", () => {
    for (const name of ["primary", "primary-strong"]) {
      const [r, g, b] = rgb(t[name]);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const hue =
        max === g ? 60 * (2 + (b - r) / (max - min)) : max === b ? 60 * (4 + (r - g) / (max - min)) : (60 * ((g - b) / (max - min)) + 360) % 360;
      expect(hue, `${name} hue`).toBeGreaterThan(160);
      expect(hue, `${name} hue`).toBeLessThan(200);
    }
    expect(css).not.toMatch(/#d03616|#bf3012|--ember/i);
  });
});

describe("text stays readable (WCAG AA, 4.5 to 1)", () => {
  const AA = 4.5;

  it("body, muted and subtle text on the page and on a sunken panel", () => {
    for (const bg of ["background", "surface", "surface-sunken"]) {
      expect(ratio("foreground", bg), `foreground on ${bg}`).toBeGreaterThanOrEqual(AA);
      expect(ratio("foreground-muted", bg), `foreground-muted on ${bg}`).toBeGreaterThanOrEqual(AA);
    }
    expect(ratio("foreground-subtle", "background")).toBeGreaterThanOrEqual(AA);
  });

  it("links and small teal labels, on white and on a sunken panel", () => {
    expect(ratio("primary", "background")).toBeGreaterThanOrEqual(AA);
    expect(ratio("primary", "surface-sunken")).toBeGreaterThanOrEqual(AA);
    expect(ratio("primary-strong", "primary-soft")).toBeGreaterThanOrEqual(AA);
  });

  it("white text on the primary button", () => {
    expect(contrast([255, 255, 255], rgb(t.primary))).toBeGreaterThanOrEqual(AA);
    expect(contrast([255, 255, 255], rgb(t["primary-strong"]))).toBeGreaterThanOrEqual(AA); // hover
  });

  it("the gold and green labels on their soft backgrounds (Hidden gem, Completed, success)", () => {
    expect(ratio("gold", "gold-soft")).toBeGreaterThanOrEqual(AA);
    expect(ratio("gold", "background")).toBeGreaterThanOrEqual(AA);
    expect(ratio("forest-strong", "forest-soft")).toBeGreaterThanOrEqual(AA);
    expect(ratio("success", "background")).toBeGreaterThanOrEqual(AA);
    expect(ratio("danger", "background")).toBeGreaterThanOrEqual(AA);
  });

  it("the Surprise Me card: white text and the softer subtitle on the flat teal, resting and hovered", () => {
    for (const bg of ["primary", "primary-strong"]) {
      expect(ratio("background", bg), `white on ${bg}`).toBeGreaterThanOrEqual(AA);
      // text-white/90 on the card
      const subtitle = over(rgb(t.background), rgb(t[bg]), 0.9);
      expect(contrast(subtitle, rgb(t[bg])), `subtitle on ${bg}`).toBeGreaterThanOrEqual(AA);
    }
  });

  it("keeps the Surprise Me card one flat color: no gradient, no fade", () => {
    const card = readFileSync(join(src, "components/home/surprise-me-button.tsx"), "utf-8");
    expect(card).not.toMatch(/gradient|mask-image|mk-gradient|opacity-90/);
    expect(card).toMatch(/bg-primary/);
  });

  it("the match chip: navy text on its white chip", () => {
    expect(contrast(rgb(t.foreground), [255, 255, 255])).toBeGreaterThanOrEqual(AA);
  });
});

describe("no component brings back the old palette", () => {
  const OLD = /#(e63f1d|ff4e2b|d03616|bf3012|1b1712|faf7f2|14120f|f2ede4|e8e1d4|6b6255|948a7a|0f5c4c)\b/i;

  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return name === "__tests__" ? [] : files(path);
      return /\.tsx$/.test(name) ? [path] : [];
    });
  }

  // The landing page paints its vivid gradients with literal hex, on purpose (decoration only).
  // The error page renders without the stylesheet, so it cannot use a token. The Google
  // logo is Google's own colors. The preview image is drawn outside the page's CSS.
  const ALLOWED = [/components[\\/]marketing[\\/]/, /google-icon\.tsx$/, /global-error\.tsx$/, /opengraph-image\.tsx$/, /app[\\/]layout\.tsx$/];

  it("reads every color inside the app through a token", () => {
    const offenders = files(src)
      .filter((f) => !ALLOWED.some((a) => a.test(f)))
      .filter((f) => OLD.test(readFileSync(f, "utf-8")))
      .map((f) => f.replace(src, ""));
    expect(offenders).toEqual([]);
  });

  it("has no dark-mode utilities left, since there is no dark theme to switch to", () => {
    const offenders = files(src)
      .filter((f) => /\bdark:/.test(readFileSync(f, "utf-8")))
      .map((f) => f.replace(src, ""));
    expect(offenders).toEqual([]);
  });
});
