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


// ---------------------------------------------------------------------------------------------------
// The pre-login pages wear the logo's orange. The owner did not like the teal on the landing page and asked for
// Zolo's own colors there; the inside keeps the teal. The "How Zolo works" band was to stay exactly as it was.

describe("the pre-login pages wear the logo's own orange", () => {
  const AA_FOR_TEST = 4.5;
  const regexEscape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockOf = (selector: string): Record<string, string> => {
    const block = css.match(new RegExp(`${regexEscape(selector)} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
    return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  };
  const zolo = blockOf('[data-palette="zolo"]');
  const keep = blockOf('[data-palette="zolo"] [data-keep-palette]');
  const marketingLayout = readFileSync(join(src, "app/(marketing)/layout.tsx"), "utf-8");
  const howItWorks = readFileSync(join(src, "components/marketing/how-it-works.tsx"), "utf-8");

  const hueOf = (hex: string) => {
    const [r, g, b] = rgb(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return -1;
    const d = max - min;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const satOf = (hex: string) => {
    const channels = rgb(hex);
    const max = Math.max(...channels);
    return max === 0 ? 0 : (max - Math.min(...channels)) / max;
  };

  it("is set on the marketing layout, and nowhere else, so the inside keeps its teal", () => {
    expect(marketingLayout).toMatch(/<div data-palette="zolo" /); // on the element itself, not just in a comment
    for (const file of ["app/(app)/layout.tsx", "app/layout.tsx", "app/(auth)/layout.tsx"]) {
      expect(readFileSync(join(src, file), "utf-8"), file).not.toMatch(/data-palette/);
    }
    expect(t.primary).toBe("#0f766e");
  });

  it("uses the orange read from the app icon, with the logo's own value", () => {
    expect(t["zolo-orange"]).toBe("#ff6a2f");
    expect(zolo["zolo-gradient"]).toContain("#ff6a2f");
  });

  it("has no green or teal in what the pages wear: links, labels, chips and tints are navy or warm", () => {
    for (const name of ["primary", "primary-strong", "primary-soft", "forest", "forest-strong", "forest-soft", "ring", "on-primary"]) {
      const value = zolo[name];
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
      const hue = hueOf(value);
      expect(hue >= 90 && hue <= 195 && satOf(value) > 0.04, `${name} ${value} is green or teal`).toBe(false);
    }
  });

  it("keeps the brand band warm on these pages: no teal or sky end", () => {
    const band = css.match(/\[data-palette="zolo"\] \.mk-gradient \{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(band).toMatch(/linear-gradient/);
    expect(band).not.toMatch(/#2fc4a3|#5ccdf5/i);
  });

  it("puts navy, not white, on the orange: white on the logo orange is under 3 to 1", () => {
    expect(contrast([255, 255, 255], rgb("#ff6a2f"))).toBeLessThan(3);
    const navy = rgb(zolo["on-primary"]);
    const stops = [...zolo["zolo-gradient"].matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0]);
    expect(stops.length).toBeGreaterThanOrEqual(2);
    for (const stop of stops) expect(contrast(navy, rgb(stop)), `navy on ${stop}`).toBeGreaterThanOrEqual(AA_FOR_TEST);
    // and the middle of the fade, where the two ends blend
    const mid = over(rgb(stops[0]), rgb(stops[stops.length - 1]), 0.5);
    expect(contrast(navy, mid), "navy on the middle of the fade").toBeGreaterThanOrEqual(AA_FOR_TEST);
    // the button rule paints the fade and writes in navy; the pricing toggle's label reads the same token
    expect(css).toMatch(/\[data-palette="zolo"\] \.bg-primary \{[^}]*background-image: var\(--zolo-gradient\);[^}]*color: var\(--foreground\);/);
    expect(readFileSync(join(src, "components/marketing/pricing-cards.tsx"), "utf-8")).toMatch(/text-\[var\(--on-primary\)\]/);
  });

  it("keeps links and small labels readable: navy on white and on the warm tints", () => {
    expect(contrast(rgb(zolo.primary), [255, 255, 255])).toBeGreaterThanOrEqual(AA_FOR_TEST);
    expect(contrast(rgb(zolo["primary-strong"]), [255, 255, 255])).toBeGreaterThanOrEqual(AA_FOR_TEST); // hover
    expect(contrast(rgb(zolo.primary), rgb(zolo["primary-soft"]))).toBeGreaterThanOrEqual(AA_FOR_TEST);
    expect(contrast(rgb(zolo["forest-strong"]), rgb(zolo["forest-soft"]))).toBeGreaterThanOrEqual(AA_FOR_TEST);
  });

  it("leaves the How Zolo works band exactly as it was: fenced off, with the inside's teal restored", () => {
    expect(howItWorks).toMatch(/id="how-it-works"\s+data-keep-palette/);
    for (const name of ["primary", "primary-strong", "primary-soft", "forest", "forest-strong", "forest-soft", "on-primary"]) {
      expect(keep[name], `${name} restored`).toBe(t[name]);
    }
    expect(keep.ring).toBe(t.primary);
    // its own colors are still the teal and the dark band
    expect(howItWorks).toMatch(/bg-\[#0a2540\]/);
    expect(howItWorks).toMatch(/bg-\[#2fc4a3\]/);
    // the button and band rules are undone inside it
    expect(css).toMatch(/\[data-keep-palette\] \.bg-primary \{[^}]*background-image: none;[^}]*color: #ffffff;/);
    expect(css).toMatch(/\[data-keep-palette\] \.mk-gradient \{[^}]*#2fc4a3[^}]*#5ccdf5/);
    // and the shared tile that swaps colors outside it takes the teal back inside it
    expect(keep["tile-outdoor-from"]).toBe("initial");
    expect(keep["tile-outdoor-to"]).toBe("initial");
  });

  it("gave the band none of the new colors: the only change to its markup is the fence", () => {
    expect(howItWorks).not.toMatch(/zolo-orange|zolo-gradient|ff6a2f/);
  });
});
