import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { trackAnalytics } from "@/lib/analytics/server";
import { LIST_WRITE_LIMIT } from "@/lib/config/lists";
import { cleanOwnList } from "@/lib/lists/own-input";
import { deleteOwnList, getOwnList, presentOwnList, saveOwnList } from "@/lib/lists/own";
import { listTag } from "@/lib/lists/store";
import { ownListSchema } from "@/lib/validation/schemas";

/**
 * One of the person's own lists, by id. Only ever the caller's own: another person's id answers 404, the same as one that
 * does not exist. Changing a list, making it private, or deleting it expires its public page at once.
 *
 *   GET     the list
 *   PATCH   change it (the same body as making one)
 *   DELETE  delete it, which also turns off its link
 */

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    const list = await getOwnList(user.id, (await params).id);
    if (!list) throw new ApiError(404, "List not found.");
    return NextResponse.json({ list: presentOwnList(list, new URL(request.url).origin) });
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    checkRateLimit(`own-list:${user.id}`, LIST_WRITE_LIMIT.max, LIST_WRITE_LIMIT.windowMs);

    const body = ownListSchema.parse(await request.json().catch(() => null));
    const input = cleanOwnList(body);
    if (!input.ok) throw new ApiError(400, input.error);

    const before = await getOwnList(user.id, (await params).id);
    if (!before) throw new ApiError(404, "List not found.");
    const saved = await saveOwnList(user.id, before.id, input.value);
    if (saved.madePublic) await trackAnalytics("share_created", { userId: user.id, props: { kind: "list" } });

    // The page cached under the old address (replaced when a private list goes public) must not outlive a change, nor the one under the current address.
    if (saved.replacedToken) revalidateTag(listTag(saved.replacedToken), { expire: 0 });
    revalidateTag(listTag(saved.list.token), { expire: 0 });
    return NextResponse.json({ list: presentOwnList(saved.list, new URL(request.url).origin) });
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    checkRateLimit(`own-list:${user.id}`, LIST_WRITE_LIMIT.max, LIST_WRITE_LIMIT.windowMs);
    const token = await deleteOwnList(user.id, (await params).id);
    if (!token) throw new ApiError(404, "List not found.");
    revalidateTag(listTag(token), { expire: 0 });
    return NextResponse.json({ ok: true });
  });
}
