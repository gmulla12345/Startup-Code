import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { createReview } from "@/lib/repositories/reviews";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { createReviewSchema } from "@/lib/validation/schemas";

/**
 * Posts a "Zolo community note" (the reviews table, user-facing as "notes"
 * rather than formal star reviews) on an experience. Deliberately allows
 * more than one note per user per experience -- this is framed as a running
 * community log, not a single canonical review, and the schema has no
 * uniqueness constraint to enforce one-per-user anyway (adding one would be
 * a separate migration). Rate-limited per authenticated user, not per IP
 * (requireUser() already establishes identity) -- generous enough for real
 * use, tight enough to block a scripted flood.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    checkRateLimit(`review:${user.id}`, 10, 60 * 60_000);

    const { id: experienceId } = await context.params;
    const body = createReviewSchema.parse({ ...(await request.json()), experienceId });

    const profile = await getProfileByUserId(supabase, user.id);
    const authorName = profile?.firstName?.trim() || "Zolo user";

    const review = await createReview(supabase, user.id, authorName, body.experienceId, body.rating, body.comment);
    return NextResponse.json({ review });
  });
}
