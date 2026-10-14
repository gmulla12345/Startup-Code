/**
 * Applies SQL directly against Postgres. Idempotent for src/db/schema.sql —
 * safe to re-run. This is the only script that needs a direct database
 * connection (DATABASE_URL); the running app itself only ever talks to
 * Supabase through the anon/service-role REST API, never a raw Postgres
 * connection.
 *
 * Usage:
 *   npm run migrate                                  # applies src/db/schema.sql
 *   npm run migrate -- src/db/migrations/<file>.sql  # applies just that migration
 *   npm run migrate -- --dry-run <file>              # runs it, then ROLLS BACK
 *
 * --dry-run executes everything inside one transaction and rolls it back, so a
 * migration can be rehearsed against the real database (syntax, constraints,
 * policy names) without changing it. Each migration file wraps itself in
 * begin/commit; those lines are stripped for the dry run so the outer
 * transaction owns the rollback.
 *
 * DATABASE_URL: set in .env.local (Supabase > Project Settings > Database >
 * Connection string).
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "pg";

config({ path: join(__dirname, "../.env.local") });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL. Set it in .env.local (Project Settings > Database > Connection string in Supabase).");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const files = args.filter((a) => !a.startsWith("--"));
  const targets = files.length > 0 ? files.map((f) => resolve(process.cwd(), f)) : [join(__dirname, "../src/db/schema.sql")];

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    for (const target of targets) {
      let sql = readFileSync(target, "utf-8");
      console.log(`${dryRun ? "[dry run] " : ""}Applying ${target}...`);
      if (dryRun) {
        sql = sql.replace(/^\s*(begin|commit);\s*$/gim, "");
        await client.query("begin");
        try {
          await client.query(sql);
          console.log("  ok (rolling back, nothing changed)");
        } finally {
          await client.query("rollback");
        }
      } else {
        await client.query(sql);
        console.log("  applied");
      }
    }
    // Supabase's REST layer keeps its own copy of the schema; direct SQL does not
    // refresh it, so a new table can answer 404 for a while. This asks it to reload.
    if (!dryRun) {
      await client.query("notify pgrst, 'reload schema'");
      console.log("Asked the API layer to reload its schema.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
