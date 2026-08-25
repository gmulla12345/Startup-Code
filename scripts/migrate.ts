/**
 * Applies src/db/schema.sql directly against Postgres. Idempotent — safe to
 * re-run. This is the only script that needs a direct database connection
 * (DATABASE_URL); the running app itself only ever talks to Supabase
 * through the anon/service-role REST API, never a raw Postgres connection.
 *
 * Usage:
 *   DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" npm run migrate
 * or set DATABASE_URL in .env.local and just run `npm run migrate`.
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

config({ path: join(__dirname, "../.env.local") });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL. Set it in .env.local (Project Settings > Database > Connection string in Supabase).");
    process.exit(1);
  }

  const sql = readFileSync(join(__dirname, "../src/db/schema.sql"), "utf-8");

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("Applying src/db/schema.sql...");
  try {
    await client.query(sql);
    console.log("Schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
