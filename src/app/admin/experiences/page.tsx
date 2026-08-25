import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExperienceManager } from "@/components/admin/experience-manager";

export default async function AdminExperiencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const isAdmin = user.app_metadata?.role === "admin" || user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) redirect("/home");

  return <ExperienceManager />;
}
