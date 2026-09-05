import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api/auth";
import { listSaved, saveExperience, setSavedStatus, unsaveExperience } from "@/lib/repositories/saved";
import { trackEvent } from "@/lib/repositories/events";
import { getExperienceProvider } from "@/services/providers";
import { saveExperienceSchema, updateSavedStatusSchema } from "@/lib/validation/schemas";

export async function GET() {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const saved = await listSaved(supabase, user.id);

    const provider = await getExperienceProvider();
    const withExperiences = await Promise.all(
      saved.map(async (s) => ({ ...s, experience: await provider.getById(s.experienceId) }))
    );

    return NextResponse.json({ saved: withExperiences.filter((s) => s.experience) });
  });
}

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const body = saveExperienceSchema.parse(await request.json());

    const saved = await saveExperience(
      supabase,
      user.id,
      body.experienceId,
      body.collection,
      body.tags,
      body.category ?? null
    );
    await trackEvent(supabase, user.id, "saved_experience", body.experienceId, { collection: body.collection });

    return NextResponse.json({ saved });
  });
}

/**
 * Flips a saved experience's status (currently only "saved" <-> "completed",
 * driven by the "Mark as completed" toggle on the experience detail page's
 * ActionBar). Upserts, so this also works for an experience the user never
 * explicitly saved first — see setSavedStatus().
 */
export async function PATCH(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const body = updateSavedStatusSchema.parse(await request.json());

    const saved = await setSavedStatus(
      supabase,
      user.id,
      body.experienceId,
      body.status,
      body.collection,
      body.tags,
      body.category ?? null
    );

    if (body.status === "completed") {
      await trackEvent(supabase, user.id, "attended_experience", body.experienceId, { collection: body.collection });
    }

    return NextResponse.json({ saved });
  });
}

export async function DELETE(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const url = new URL(request.url);
    const experienceId = url.searchParams.get("experienceId");
    const collection = url.searchParams.get("collection") ?? "Saved";

    if (!experienceId) {
      return NextResponse.json({ error: "experienceId is required." }, { status: 400 });
    }

    await unsaveExperience(supabase, user.id, experienceId, collection);
    return NextResponse.json({ ok: true });
  });
}
