import "./load-env";
import { parseArgs } from "node:util";
import { brand } from "../src/lib/config/brand";
import { listPath } from "../src/lib/config/lists";
import { parsePlaceArg, planHouseList, voiceWarnings } from "../src/lib/lists/house-plan";
import { generateShareToken } from "../src/lib/share/token";

/**
 * Writes a "house list": a list of our own (a title, a line of copy, three to ten places, a line under
 * each), optionally with a first and a last day. Home shows it, above the lists made for each person,
 * on the days it is open, and drops it the day after it ends. Its page is /l/<token>.
 *
 *   npm run house-list -- --title "Wet weather" --blurb "Somewhere dry, for the week ahead." \
 *     --place "ChIJ...aaa=Warm, with room to sit" --place "ChIJ...bbb=Free on weekdays" --place "ChIJ...ccc" \
 *     --starts 2026-10-26 --ends 2026-11-01
 *
 * That is a DRY RUN: it checks everything and prints what it would write, and writes nothing. Add --apply to
 * write it.
 *
 *   --title    1 to 80 characters (required)
 *   --blurb    one line of copy, up to 160 characters
 *   --place    a Google place id, optionally "=" and our own line under it (up to 140 characters). Give it
 *              three to ten times, in the order they are to appear. (A place id can be found with Google's
 *              Place ID Finder.)
 *   --starts   first day shown, YYYY-MM-DD. Leave out to show it from now on.
 *   --ends     last day shown, YYYY-MM-DD, through the end of that day. Leave out for no end.
 *   --apply    really write it
 *
 * **--apply writes to the database .env.local points at, which is PRODUCTION.** Never run it as a test.
 * Dates are read in the zone set by LIST_TIMEZONE in src/lib/config/lists.ts.
 */

const { values } = parseArgs({
  options: {
    title: { type: "string" },
    blurb: { type: "string" },
    place: { type: "string", multiple: true },
    starts: { type: "string" },
    ends: { type: "string" },
    apply: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

async function main() {
  if (!values.title || !values.place?.length) fail("Needs --title and at least three --place. See the comment at the top of scripts/create-house-list.ts.");

  let plan;
  try {
    plan = planHouseList({ title: values.title, blurb: values.blurb, places: values.place.map(parsePlaceArg), startsOn: values.starts, endsOn: values.ends });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  console.log("\nThe list:\n");
  console.log(JSON.stringify(plan.list, null, 2));
  console.log(`\nThe places (${plan.places.length}):\n`);
  for (const p of plan.places) console.log(`${p.position}. ${p.place_id}${p.why ? `  |  ${p.why}` : ""}`);
  for (const w of voiceWarnings([plan.list.title, plan.list.blurb, ...plan.places.map((p) => p.why)])) console.warn(`\nNote: ${w}`);

  if (!values.apply) {
    console.log("\nDry run. Nothing was written. Run again with --apply to write it.\n");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  console.log(`\nWriting to ${new URL(url).host} ...`);

  // Imported here so a dry run never reaches for the database client.
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const admin = createAdminClient();
  const token = generateShareToken();

  const { data: list, error } = await admin.from("lists").insert({ token, user_id: null, template: null, ...plan.list }).select("id").single();
  if (error) fail(`Could not write the list: ${error.message}`);

  const { error: placesError } = await admin.from("list_places").insert(plan.places.map((p) => ({ list_id: list.id, ...p })));
  if (placesError) {
    await admin.from("lists").delete().eq("id", list.id); // nothing half-written is left behind
    fail(`Could not write the places, so the list was removed: ${placesError.message}`);
  }

  console.log(`\nWritten. Its page: ${brand.domain}${listPath(token)}\nTo take it down early: delete from public.lists where token = '${token}';\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
