import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { LIST_WRITE_LIMIT } from "@/lib/config/lists";
import { deleteSharedList, listTag } from "@/lib/lists/store";
import { isShareToken } from "@/lib/share/token";

/**
 * Turns a list link off. The rows are deleted, so there is nothing left to switch
 * back on: the address answers 404 from then on, exactly as one that never existed
 * does, and sharing again makes a new address. The cached copy of the page is expired
 * in the same breath, with no stale copy served (expire: 0).
 */
export async function DELETE(_request: Request, context: { params: Promise<{ token: string }> }) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    checkRateLimit(`list:${user.id}`, LIST_WRITE_LIMIT.max, LIST_WRITE_LIMIT.windowMs);

    const { token } = await context.params;
    if (!isShareToken(token)) throw new ApiError(404, "Link not found.");

    // Only the owner's own list is deleted; anyone else's token is just "not found".
    if (!(await deleteSharedList(user.id, token))) throw new ApiError(404, "Link not found.");

    revalidateTag(listTag(token), { expire: 0 });
    return NextResponse.json({ ok: true });
  });
}
