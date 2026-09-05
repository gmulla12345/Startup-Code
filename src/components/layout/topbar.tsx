import { Logo } from "@/components/shared/logo";
import { UserMenu } from "./user-menu";
import type { Profile } from "@/types/database";

/**
 * Present on every authenticated (app) page — see AppShell. Desktop already
 * has the sidebar's own logo, so this row is just the corner account menu
 * there; on mobile (no sidebar) it also carries the logo, same as
 * PublicHeader does for logged-out visitors.
 */
export function Topbar({ profile, email, premium }: { profile: Profile; email: string | null; premium: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 md:h-16 px-4 sm:px-6 border-b border-border bg-surface/90 backdrop-blur-sm md:border-b-0 md:bg-transparent md:backdrop-blur-none">
      <div className="md:hidden">
        <Logo href="/home" className="text-lg" />
      </div>
      <div className="ml-auto">
        <UserMenu profile={profile} email={email} premium={premium} />
      </div>
    </header>
  );
}
