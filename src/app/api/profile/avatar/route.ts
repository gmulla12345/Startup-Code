import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId, updateProfile } from "@/lib/repositories/profile";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Uploads via the admin (service-role) client, same pattern as the resumes
 * bucket in careers/apply — the avatars bucket is public-read but not
 * user-scoped via storage RLS, so writes go through here after requireUser()
 * confirms who's asking, rather than relying on storage policies.
 */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();

    const formData = await request.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError(400, "No image provided.");
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new ApiError(400, "Image is too large (5MB max).");
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new ApiError(400, "Image must be a JPEG, PNG, WEBP, or GIF.");
    }

    const admin = createAdminClient();
    const ext = file.type.split("/")[1] ?? "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(path, await file.arrayBuffer(), { contentType: file.type });
    if (uploadError) throw new ApiError(500, "Couldn't upload image.");

    const { data: publicUrlData } = admin.storage.from("avatars").getPublicUrl(path);

    const previousProfile = await getProfileByUserId(supabase, user.id);
    const profile = await updateProfile(supabase, user.id, { avatarUrl: publicUrlData.publicUrl });

    // Best-effort cleanup of the previous photo so storage doesn't grow
    // unbounded — never blocks or fails the response.
    const oldPath = previousProfile?.avatarUrl?.split("/storage/v1/object/public/avatars/")[1];
    if (oldPath) {
      const { error: removeError } = await admin.storage.from("avatars").remove([oldPath]);
      if (removeError) console.error("[avatar] failed to remove previous photo:", removeError.message);
    }

    return NextResponse.json({ profile });
  });
}
