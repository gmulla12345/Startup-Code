import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { trackAnalytics } from "@/lib/analytics/server";
import { LIST_WRITE_LIMIT } from "@/lib/config/lists";
import { cleanOwnList } from "@/lib/lists/own-input";
import { listOwnLists, presentOwnList, saveOwnList } from "@/lib/lists/own";
import { listTag } from "@/lib/lists/store";
import { ownListSchema } from "@/lib/validation/schemas";

/**
 * Lists a person makes themselves: from places they have saved, a title and a line of copy they write. Private to them unless
 * they choose a link. Always for the person asking (found from who they are, never from the request), and it works with a
 * bearer token, so the mobile app can call it as it is.
 *
 *   GET   the person's own lists
 *   POST  make one: { title, blurb?, experienceIds: ["g-...", ...], isPublic?: false, showName?: false }
 */

export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    const origin = new URL(request.url).origin;
    const lists = await listOwnLists(user.id);
    return NextResponse.json({ lists: lists.map((l) => presentOwnList(l, origin)) });
  });
}

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    checkRateLimit(`own-list:${user.id}`, LIST_WRITE_LIMIT.max, LIST_WRITE_LIMIT.windowMs);

    const body = ownListSchema.parse(await request.json().catch(() => null));
    const input = cleanOwnList(body);
    if (!input.ok) throw new ApiError(400, input.error);

    const saved = await saveOwnList(user.id, null, input.value);
    if (saved.madePublic) await trackAnalytics("share_created", { userId: user.id, props: { kind: "list" } });
    revalidateTag(listTag(saved.list.token), { expire: 0 });
    return NextResponse.json({ list: presentOwnList(saved.list, new URL(request.url).origin) }, { status: 201 });
  });
}
