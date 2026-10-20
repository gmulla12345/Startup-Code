import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { START_LIST_LIMIT } from "@/lib/config/start";
import { buildFirstList } from "@/lib/start/build";
import { parseListRequest } from "@/lib/start/input";

/**
 * Makes the first list for a visitor with no account: two answers and where they are.
 * Public, because that is the point, and so bounded: a limit per visitor address, and
 * a daily ceiling on the Google calls made for visitors with no account
 * (ANONYMOUS_DAILY_PLACES_CAPS.start_list). The location is used for this request and
 * is not stored, logged or returned; the response carries only what the page draws.
 *
 * "One list" is the product's rule and is held by the page; here it is the limits above
 * that keep the cost bounded, not a promise a script could not get around.
 */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ip = (request.headers.get("x-forwarded-for") ?? "anonymous").split(",")[0].trim();
    checkRateLimit(`start-list:${ip}`, START_LIST_LIMIT.max, START_LIST_LIMIT.windowMs);

    const input = parseListRequest(await request.json().catch(() => null));
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });

    const list = await buildFirstList(input.value);
    return NextResponse.json({ list });
  });
}
