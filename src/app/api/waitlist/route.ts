import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { attributionFromCookieHeader } from "@/lib/attribution";
import { isValidEmail, normalizeEmail } from "@/lib/campus";

/**
 * "Don't see your school?" on /students: saves an email, and optionally the
 * school's name, to campus_waitlist. Public (no account), so it is narrow:
 *
 *   - Rate-limited per IP, and a hidden field (`company`) that a person never
 *     fills in turns away simple bots, which are told it worked.
 *   - A repeat email is stored once and answered exactly like a new one, so the
 *     endpoint cannot be used to find out who is on the list.
 *   - Written with the service role; the table has no client access at all.
 *   - The campaign src/code the visitor arrived with is recorded alongside, so
 *     demand can be read per poster or per club.
 *
 * Only the email and an optional school name are collected: no name, no phone.
 */

const bodySchema = z.object({
  email: z.string().max(320),
  school: z.string().max(200).optional(),
  // A honeypot: invisible to people, tempting to bots.
  company: z.string().optional(),
});

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    checkRateLimit(`waitlist:${ip}`, 5, 10 * 60_000);

    const body = bodySchema.parse(await request.json().catch(() => null));
    if (body.company) return NextResponse.json({ ok: true });

    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) throw new ApiError(400, "Please enter a valid email address.");

    const school = body.school?.trim().slice(0, 100) || null;
    const { src, code } = attributionFromCookieHeader(request.headers.get("cookie"));

    const { error } = await createAdminClient().from("campus_waitlist").insert({ email, school, src, code });
    // 23505: already on the list. Answered the same as a new signup, on purpose.
    if (error && error.code !== "23505") {
      console.error("[waitlist] could not save:", error.message);
      throw new ApiError(500, "Something went wrong. Please try again.");
    }

    return NextResponse.json({ ok: true });
  });
}
