/**
 * Import this FIRST in a script. Some modules (src/ai/client.ts) read
 * environment variables when they are first imported, and ES imports run in
 * order, so loading .env.local from a side-effect import guarantees it is in
 * place before any of them.
 */
import { config } from "dotenv";
import { join } from "node:path";

config({ path: join(__dirname, "../.env.local"), quiet: true });
