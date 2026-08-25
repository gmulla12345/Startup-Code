import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { ContentArea } from "./content-area";

export function AppShell({ children, premium }: { children: ReactNode; premium: boolean }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar premium={premium} />
      <ContentArea>{children}</ContentArea>
      <BottomNav />
    </div>
  );
}
