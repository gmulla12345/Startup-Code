import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { CAMPUS_DIRECTORY } from "@/lib/campus-directory";

// The product speaks to students in general: no page, component, piece of copy,
// metadata or comment may name a particular school. Schools exist in the product
// only as data (the picker's options and the email domains that verify a student),
// which lives in lib/campus-directory.ts and the database, never in what we write.

const src = join(__dirname, "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|json|md|css)$/.test(name) ? [path] : [];
  });
}

// Everything that is written for a reader or for other developers, except the school data itself.
const WRITTEN = ["app", "components", "lib", "hooks", "services", "ai", "types"]
  .flatMap((d) => files(join(src, d)))
  .filter((f) => !/lib[\\/]campus-directory\.ts$/.test(f));

describe("campus-neutral copy", () => {
  it("never names the pilot school, anywhere that is written for a reader or another developer", () => {
    const offenders = WRITTEN.filter((f) => /loyola/i.test(readFileSync(f, "utf-8"))).map((f) => f.replace(src, ""));
    expect(offenders).toEqual([]);
  });

  it("never names any school from the directory", () => {
    const names = CAMPUS_DIRECTORY.map((c) => c.name);
    const offenders: string[] = [];
    for (const f of WRITTEN) {
      const text = readFileSync(f, "utf-8");
      for (const name of names) if (text.includes(name)) offenders.push(`${f.replace(src, "")}: ${name}`);
    }
    expect(offenders).toEqual([]);
  });
});
