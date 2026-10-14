import "./load-env";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AI_MODEL, isAIConfigured } from "../src/ai/client";
import { generateStudentsPreview, realDeps } from "../src/lib/students/preview";

/**
 * Regenerates the example output shown on /students by running the real
 * Surprise Me reasoning and Weekend Planner (two Claude calls, a few cents).
 *
 *   npm run students-preview
 *
 * Review src/lib/content/students-preview.json before committing it: it is
 * model output, shown on the page exactly as written. Run it again for a
 * different draw. It fails (rather than writing anything) if either half fell
 * back to its non-AI version.
 */
async function main() {
  if (!isAIConfigured()) {
    console.error("ANTHROPIC_API_KEY is not set (.env.local).");
    process.exitCode = 1;
    return;
  }

  const preview = await generateStudentsPreview(realDeps(AI_MODEL));
  const target = join(__dirname, "../src/lib/content/students-preview.json");
  writeFileSync(target, JSON.stringify(preview, null, 2) + "\n");

  console.log(`Wrote ${target}\n`);
  console.log("Surprise Me:", preview.surpriseMe.title);
  console.log("  ", preview.surpriseMe.reasoning, "\n");
  console.log("Weekend:", preview.weekend.summary);
  for (const day of preview.weekend.days) {
    console.log(`  ${day.day}`);
    for (const item of day.items) console.log(`    ${item.time}  ${item.title}  — ${item.note}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
