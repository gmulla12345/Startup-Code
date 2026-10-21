import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { ListEditor } from "@/components/lists/list-editor";
import { PLACE_ID_PREFIX } from "@/lib/google/place-id";
import { getOwnList } from "@/lib/lists/own";
import { loadSavedChoices } from "@/lib/lists/own-choices";
import { noindexMetadata } from "@/lib/seo";

export const metadata = noindexMetadata;

/** Changing one of your own lists. Another person's list, or none, is a plain not-found. */
export default async function EditListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const list = await getOwnList(user.id, id);
  if (!list) notFound();

  const supabase = await createClient();
  const experienceIds = list.placeIds.map((p) => `${PLACE_ID_PREFIX}${p}`);
  const [choices, profile] = await Promise.all([loadSavedChoices(user.id, experienceIds), getProfileByUserId(supabase, user.id)]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/lists" className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted">
        <ArrowLeft className="h-4 w-4" /> Your lists
      </Link>
      {/* COPY: the heading on the page where a list is changed */}
      <h1 className="mb-6 font-display text-3xl font-semibold text-foreground">Edit list</h1>
      <ListEditor
        choices={choices}
        firstName={profile?.firstName ?? ""}
        initial={{ id: list.id, title: list.title, blurb: list.blurb, experienceIds, isPublic: list.isPublic, showName: list.showName }}
      />
    </div>
  );
}
