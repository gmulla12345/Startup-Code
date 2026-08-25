import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobApplicationSchema } from "@/lib/validation/schemas";

/** Public endpoint — no auth required to apply for a job. */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    checkRateLimit(`careers-apply:${ip}`, 5, 60_000);

    const body = jobApplicationSchema.parse(await request.json());
    const admin = createAdminClient();

    const { error } = await admin.from("job_applications").insert({
      role: body.role,
      full_name: body.fullName,
      email: body.email,
      linkedin_url: body.linkedinUrl,
      portfolio_url: body.portfolioUrl,
      cover_letter: body.coverLetter,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  });
}
