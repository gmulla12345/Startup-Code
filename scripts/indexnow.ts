/**
 * Tells IndexNow-participating search engines (Bing, Yandex, Naver, Seznam)
 * which URLs exist on the live site, so new and changed pages are crawled
 * promptly. Run AFTER a production deploy:
 *
 *   npm run indexnow             # submit every URL in the live sitemap
 *   npm run indexnow -- --dry-run  # print what would be sent, send nothing
 *
 * It reads the live /sitemap.xml (so it always matches what was deployed),
 * checks the key file is reachable at the site root -- IndexNow verifies
 * ownership by fetching it, so a submit before the deploy finishes would be
 * rejected -- then POSTs the list to the shared IndexNow endpoint. Only this
 * site's own public URLs are sent; no user data.
 */
import { brand } from "../src/lib/config/brand";
import { INDEXNOW_KEY } from "../src/lib/config/indexnow";

const ENDPOINT = "https://api.indexnow.org/IndexNow";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const origin = brand.domain.replace(/\/$/, "");
  const host = new URL(origin).host;
  const keyLocation = `${origin}/${INDEXNOW_KEY}.txt`;

  const keyRes = await fetch(keyLocation);
  const keyBody = keyRes.ok ? (await keyRes.text()).trim() : "";
  // `process.exitCode` + return, not `process.exit()`: exiting while fetch's
  // sockets are still closing trips a libuv assertion crash on Windows.
  if (keyBody !== INDEXNOW_KEY) {
    console.error(
      `IndexNow key file not live at ${keyLocation} (status ${keyRes.status}). Deploy first, then re-run.`
    );
    process.exitCode = 1;
    return;
  }

  const sitemapRes = await fetch(`${origin}/sitemap.xml`);
  if (!sitemapRes.ok) {
    console.error(`Could not read ${origin}/sitemap.xml (status ${sitemapRes.status}).`);
    process.exitCode = 1;
    return;
  }
  const xml = await sitemapRes.text();
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urlList.length === 0) {
    console.error("Sitemap listed no URLs; nothing to submit.");
    process.exitCode = 1;
    return;
  }

  console.log(`${dryRun ? "[dry run] Would submit" : "Submitting"} ${urlList.length} URLs for ${host}:`);
  for (const url of urlList) console.log(`  ${url}`);
  if (dryRun) return;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation, urlList }),
  });
  // 200 = accepted; 202 = accepted, key validation pending. Anything else is a real problem.
  if (res.status === 200 || res.status === 202) {
    console.log(`IndexNow accepted the submission (HTTP ${res.status}).`);
  } else {
    console.error(`IndexNow rejected the submission: HTTP ${res.status} ${await res.text()}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
