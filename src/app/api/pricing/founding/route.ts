import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { FOUNDING_STATUS_LIMIT } from "@/lib/config/founding";
import { isStudentPlanConfigured } from "@/lib/config/pricing";
import { getFoundingStatus, publicFoundingStatus, type PublicFoundingStatus } from "@/lib/founding/offer";

/**
 * Whether the student price can be bought, and how many founding spots are left when that is
 * worth saying: what the pricing page needs to show the offer honestly. Public (nothing here
 * is about a person), cached for half a minute by the CDN so the page can ask on every visit
 * without a database read each time, and rate limited per address.
 *
 * It gives out only what a visitor may be told: whether the price is open, whether it has a
 * limit, and the number of spots left ONLY when the owner's threshold says to show it. The limit
 * itself, and the count above the threshold, are never returned.
 *
 * This only shapes what the page shows. The limit is enforced where the price is sold, at
 * checkout, which reads the real count again.
 */
export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const ip = (request.headers.get("x-forwarded-for") ?? "anonymous").split(",")[0].trim();
    checkRateLimit(`founding:${ip}`, FOUNDING_STATUS_LIMIT.max, FOUNDING_STATUS_LIMIT.windowMs);

    let body: PublicFoundingStatus;
    if (!isStudentPlanConfigured()) {
      body = { open: false, capped: false, remaining: null };
    } else {
      try {
        body = publicFoundingStatus(await getFoundingStatus());
      } catch (err) {
        // If the count cannot be read the page shows the offer without a number; checkout still decides.
        console.error("[founding] status unavailable:", err);
        body = { open: true, capped: false, remaining: null };
      }
    }

    return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  });
}
