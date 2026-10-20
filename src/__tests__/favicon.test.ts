import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Google shows a site's favicon beside its search results only when it can find one
// that is a square multiple of 48 pixels. Next.js declares a .ico by its FIRST entry,
// and ours listed the 16px image first, so the page said "16x16" and Google showed a
// globe instead of the logo. These tests keep the icons Google needs in place.

const app = join(__dirname, "../app");
const png = (name: string) => {
  const b = readFileSync(join(app, name));
  expect(b.subarray(1, 4).toString(), `${name} is a PNG`).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};

describe("the favicon Google reads", () => {
  it("lists the 48px image first in favicon.ico, which is the size the page declares for it", () => {
    const ico = readFileSync(join(app, "favicon.ico"));
    expect(ico.readUInt16LE(2)).toBe(1); // an icon file
    expect(ico[6] || 256, "first entry width").toBe(48);
    expect(ico[7] || 256, "first entry height").toBe(48);
  });

  it("keeps every image in favicon.ico intact", () => {
    const ico = readFileSync(join(app, "favicon.ico"));
    const count = ico.readUInt16LE(4);
    expect(count).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < count; i++) {
      const entry = 6 + i * 16;
      const size = ico.readUInt32LE(entry + 8);
      const offset = ico.readUInt32LE(entry + 12);
      expect(offset + size, `entry ${i} fits inside the file`).toBeLessThanOrEqual(ico.length);
      expect(ico.subarray(offset + 1, offset + 4).toString(), `entry ${i} is a PNG image`).toBe("PNG");
    }
  });

  it("offers square PNG icons whose sides are multiples of 48 pixels", () => {
    for (const name of ["icon1.png", "icon.png"]) {
      const { width, height } = png(name);
      expect(width, name).toBe(height);
      expect(width, name).toBeGreaterThanOrEqual(48);
    }
    expect(png("icon1.png").width % 48, "icon1.png is a multiple of 48").toBe(0);
  });

  it("keeps the touch icon for phones' home screens", () => {
    expect(png("apple-icon.png")).toEqual({ width: 180, height: 180 });
  });
});
