import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { SHARE_WRITE_LIMIT } from "@/lib/config/share";
import { deleteShareLink } from "@/lib/share/links";
import { isShareToken, shareTag } from "@/lib/share/token";

/**
 * Turns a share link off. The row is deleted, so there is nothing left to switch
 * back on: the address answers 404 from then on, exactly as one that never
 * existed does, and sharing again makes a new address. The cached copies of the
 * page and its preview image are expired in the same breath, with no stale copy
 * served (expire: 0), so the page does not outlive the link by even one visit.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ token: string }> }) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    checkRateLimit(`share:${user.id}`, SHARE_WRITE_LIMIT.max, SHARE_WRITE_LIMIT.windowMs);

    const { token } = await context.params;
    if (!isShareToken(token)) throw new ApiError(404, "Link not found.");

    // Only the owner's own link is deleted; anyone else's token is just "not found".
    if (!(await deleteShareLink(user.id, token))) throw new ApiError(404, "Link not found.");

    revalidateTag(shareTag(token), { expire: 0 });
    return NextResponse.json({ ok: true });
  });
}
