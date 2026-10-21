import { createClient } from "@/lib/supabase/server";
import { listSaved } from "@/lib/repositories/saved";
import { getExperienceProvider } from "@/services/providers";
import { usageContext } from "@/lib/usage/context";
import { OWN_LIST_CHOICES } from "@/lib/config/lists";
import { placeIdFromExperienceId } from "@/lib/share/input";
import { formatCategoryLabel } from "@/lib/utils/format";

/** A place the person has saved, as the list editor offers it. Names come from Google when the page is built and are not kept. */
export interface SavedChoice {
  id: string;
  title: string;
  subtitle: string;
}

/**
 * The places a person may put on a list of their own: the ones they have saved from Google, newest first, at most
 * OWN_LIST_CHOICES of them (each is a real-place lookup, cached for an hour), plus any already on the list being edited.
 * A place that cannot be looked up just now is left out rather than shown nameless.
 */
export async function loadSavedChoices(userId: string, alsoIds: readonly string[] = []): Promise<SavedChoice[]> {
  const supabase = await createClient();
  const saved = await listSaved(supabase, userId);
  const recent = saved.map((s) => s.experienceId).filter((id) => placeIdFromExperienceId(id) !== null).slice(0, OWN_LIST_CHOICES);
  const ids = [...new Set([...alsoIds, ...recent])];
  const provider = await getExperienceProvider(usageContext(userId, "saved"));
  const found = await Promise.all(ids.map(async (id) => ({ id, experience: await provider.getById(id).catch(() => null) })));
  return found
    .filter((f) => f.experience)
    .map((f) => ({
      id: f.id,
      title: f.experience!.title,
      subtitle: [formatCategoryLabel(f.experience!.category), f.experience!.city].filter(Boolean).join(" · "),
    }));
}
