import { NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobApplicationSchema } from "@/lib/validation/schemas";

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** Public endpoint — no auth required to apply for a job. */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    checkRateLimit(`careers-apply:${ip}`, 5, 60_000);

    const formData = await request.formData();
    const body = jobApplicationSchema.parse({
      role: formData.get("role"),
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      linkedinUrl: formData.get("linkedinUrl") || null,
      coverLetter: formData.get("coverLetter"),
    });

    const admin = createAdminClient();
    const resume = formData.get("resume");
    let resumeUrl: string | null = null;

    if (resume instanceof File && resume.size > 0) {
      if (resume.size > MAX_RESUME_BYTES) {
        throw new ApiError(400, "Resume file is too large (5MB max).");
      }
      if (!ALLOWED_RESUME_TYPES.has(resume.type)) {
        throw new ApiError(400, "Resume must be a PDF, DOC, or DOCX file.");
      }

      const ext = resume.name.split(".").pop() ?? "pdf";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await admin.storage
        .from("resumes")
        .upload(path, await resume.arrayBuffer(), { contentType: resume.type });
      if (uploadError) throw uploadError;

      resumeUrl = admin.storage.from("resumes").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await admin.from("job_applications").insert({
      role: body.role,
      full_name: body.fullName,
      email: body.email,
      linkedin_url: body.linkedinUrl,
      resume_url: resumeUrl,
      cover_letter: body.coverLetter,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  });
}
