import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { START_RESTORE_LIMIT } from "@/lib/config/start";
import { restoreFirstList } from "@/lib/start/build";
import { parseRestoreRequest } from "@/lib/start/input";

/**
 * The places of a first list the visitor already has, asked for again by id. The browser
 * keeps only ids (Google's names, photos and ratings are not ours to keep), so when the
 * visitor comes back, or taps into a place and returns, this gives them the details.
 * Bounded like making a list: a limit per visitor address, and the same daily ceiling
 * on Google calls for visitors with no account.
 */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ip = (request.headers.get("x-forwarded-for") ?? "anonymous").split(",")[0].trim();
    checkRateLimit(`start-restore:${ip}`, START_RESTORE_LIMIT.max, START_RESTORE_LIMIT.windowMs);

    const input = parseRestoreRequest(await request.json().catch(() => null));
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });

    return NextResponse.json({ list: await restoreFirstList(input.value) });
  });
}
