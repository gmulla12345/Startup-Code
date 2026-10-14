import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { trackAnalytics } from "@/lib/analytics/server";
import { sharePath, SHARE_WRITE_LIMIT } from "@/lib/config/share";
import { cleanNote, placeIdFromExperienceId } from "@/lib/share/input";
import { findShareLink, saveShareLink, userOwnsItinerary, type ShareLink, type ShareTarget } from "@/lib/share/links";
import { shareTag } from "@/lib/share/token";
import { shareRequestSchema } from "@/lib/validation/schemas";

/**
 * Making, looking up and changing a share link. The routes check who is asking and
 * what they own; the table itself is closed to every browser key.
 *
 *   POST  make this person's link for a place or a plan, or update the one they
 *         already have (sharing the same thing twice never makes a second link).
 *   GET   the link they already have for a target, if any, so the screen can show it.
 *
 * Turning a link off is DELETE /api/shares/[token]. All of it works with a bearer
 * token too (requireUser), so the mobile app can call it as-is.
 */

function present(link: ShareLink, origin: string) {
  return { token: link.token, kind: link.kind, url: `${origin}${sharePath(link.token)}`, note: link.note, showName: link.showName };
}

async function resolveTarget(userId: string, input: { kind: "place"; experienceId: string } | { kind: "plan"; itineraryId: string }): Promise<ShareTarget> {
  if (input.kind === "place") {
    const placeId = placeIdFromExperienceId(input.experienceId);
    if (!placeId) throw new ApiError(400, "This place cannot be shared as a link yet.");
    return { kind: "place", placeId };
  }
  if (!(await userOwnsItinerary(userId, input.itineraryId))) throw new ApiError(404, "Plan not found.");
  return { kind: "plan", itineraryId: input.itineraryId };
}

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    checkRateLimit(`share:${user.id}`, SHARE_WRITE_LIMIT.max, SHARE_WRITE_LIMIT.windowMs);

    const body = shareRequestSchema.parse(await request.json().catch(() => null));
    const note = cleanNote(body.note);
    if (!note.ok) throw new ApiError(400, note.error);

    const target = await resolveTarget(user.id, body);
    const { link, created } = await saveShareLink({ userId: user.id, target, note: note.note, showName: body.showName });

    if (created) {
      await trackAnalytics("share_created", { userId: user.id, props: { kind: link.kind } });
    } else {
      // The note or the name may have changed: the page must show the new words now,
      // not up to an hour from now (an unticked name must disappear at once).
      revalidateTag(shareTag(link.token), { expire: 0 });
    }

    return NextResponse.json({ link: present(link, new URL(request.url).origin) }, { status: created ? 201 : 200 });
  });
}

export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const { user } = await requireUser();
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind");

    const parsed =
      kind === "place"
        ? ({ kind: "place", experienceId: params.get("experienceId") ?? "" } as const)
        : kind === "plan"
          ? ({ kind: "plan", itineraryId: params.get("itineraryId") ?? "" } as const)
          : null;
    if (!parsed) throw new ApiError(400, "Say whether this is a place or a plan.");

    // Same checks as making one, so a lookup cannot be used to probe ids.
    if (parsed.kind === "plan" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.itineraryId)) {
      throw new ApiError(400, "That is not a plan.");
    }
    const target = await resolveTarget(user.id, parsed);
    const link = await findShareLink(user.id, target);
    return NextResponse.json({ link: link ? present(link, new URL(request.url).origin) : null });
  });
}
