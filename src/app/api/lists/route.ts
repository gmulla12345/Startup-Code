import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { trackAnalytics } from "@/lib/analytics/server";
import { LIST_WRITE_LIMIT, listPath } from "@/lib/config/lists";
import { cleanPlaceIds } from "@/lib/lists/input";
import { findSharedList, listTag, saveSharedList } from "@/lib/lists/store";
import { getListTemplate } from "@/lib/lists/templates";

/**
 * Making and looking up the public link for one of a person's lists. The routes check
 * who is asking and what they send; the tables themselves are closed to every browser
 * key. Turning a link off is DELETE /api/lists/[token]. All of it works with a bearer
 * token too (requireUser), so the mobile app can call it as-is.
 *
 *   POST  make this person's link for a list, or update the one they already have for
 *         the same kind of list (sharing again never makes a second link).
 *   GET   the link they already have for a kind of list, if any, so the screen can show it.
 *
 * The title and the line of copy are never taken from the request: they are read from
 * the list's template on the server, so nobody can publish their own words under a Zolo
 * list. What is stored is the template and the Google place ids, nothing else.
 */

function present(token: string, origin: string) {
  return { token, url: `${origin}${listPath(token)}` };
}

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    checkRateLimit(`list:${user.id}`, LIST_WRITE_LIMIT.max, LIST_WRITE_LIMIT.windowMs);

    const body = (await request.json().catch(() => null)) as { template?: unknown; placeIds?: unknown } | null;
    const template = getListTemplate(body?.template);
    if (!template) throw new ApiError(400, "That is not a list we know.");
    const places = cleanPlaceIds(body?.placeIds);
    if (!places.ok) throw new ApiError(400, places.error);

    const { token, created } = await saveSharedList({ userId: user.id, template, placeIds: places.ids });

    if (created) {
      await trackAnalytics("share_created", { userId: user.id, props: { kind: "list" } });
    } else {
      // The places may have changed: the page must show the new ones now, not up to an hour from now.
      revalidateTag(listTag(token), { expire: 0 });
    }

    return NextResponse.json({ link: present(token, new URL(request.url).origin) }, { status: created ? 201 : 200 });
  });
}

export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    const template = getListTemplate(new URL(request.url).searchParams.get("template"));
    if (!template) throw new ApiError(400, "That is not a list we know.");

    const found = await findSharedList(user.id, template.id);
    return NextResponse.json({ link: found ? present(found.token, new URL(request.url).origin) : null });
  });
}
