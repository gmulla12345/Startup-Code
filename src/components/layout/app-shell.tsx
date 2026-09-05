import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { ContentArea } from "./content-area";
import { Topbar } from "./topbar";
import type { Profile } from "@/types/database";

export function AppShell({
  children,
  profile,
  email,
  premium,
}: {
  children: ReactNode;
  profile: Profile;
  email: string | null;
  premium: boolean;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar premium={premium} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar profile={profile} email={email} premium={premium} />
        <ContentArea>{children}</ContentArea>
      </div>
      <BottomNav />
    </div>
  );
}
