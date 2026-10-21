import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { ListEditor } from "@/components/lists/list-editor";
import { loadSavedChoices } from "@/lib/lists/own-choices";
import { noindexMetadata } from "@/lib/seo";

export const metadata = noindexMetadata;

export default async function NewListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [choices, profile] = await Promise.all([loadSavedChoices(user.id), getProfileByUserId(supabase, user.id)]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/lists" className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted">
        <ArrowLeft className="h-4 w-4" /> Your lists
      </Link>
      {/* COPY: the heading on the page where a list is made */}
      <h1 className="mb-6 font-display text-3xl font-semibold text-foreground">New list</h1>
      <ListEditor choices={choices} firstName={profile?.firstName ?? ""} />
    </div>
  );
}
