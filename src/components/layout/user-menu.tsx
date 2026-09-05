"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Briefcase, CheckCircle2, ChevronDown, LogOut, Pencil, Sparkles, User as UserIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import type { Profile } from "@/types/database";

/**
 * Corner account menu shown on every authenticated page (see Topbar) — the
 * pattern most successful apps use (Gmail, Notion, Linear, Airbnb): a small
 * avatar button, top-right, that opens a dropdown to the account's own
 * pages plus log out. The sidebar's own nav links stay untouched; this is a
 * second, faster path to the same destinations plus account-only actions
 * (edit profile, upgrade, log out) that don't belong in primary nav.
 */
export function UserMenu({ profile, email, premium }: { profile: Profile; email: string | null; premium: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const name = profile.firstName || "Your profile";

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 hover:bg-surface-sunken transition-colors"
      >
        <Avatar src={profile.avatarUrl} name={name} size={34} />
        <ChevronDown className={cn("h-3.5 w-3.5 text-foreground-subtle transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-raised)] py-2 z-50">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border mb-1">
            <Avatar src={profile.avatarUrl} name={name} size={40} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{name}</p>
              {email && <p className="text-xs text-foreground-muted truncate">{email}</p>}
            </div>
          </div>

          <MenuLink href="/profile" icon={UserIcon} onClick={() => setOpen(false)}>
            View profile
          </MenuLink>
          <MenuLink href="/profile/edit" icon={Pencil} onClick={() => setOpen(false)}>
            Edit profile
          </MenuLink>
          <MenuLink href="/saved" icon={Bookmark} onClick={() => setOpen(false)}>
            Saved
          </MenuLink>
          <MenuLink href="/profile/completed" icon={CheckCircle2} onClick={() => setOpen(false)}>
            Completed
          </MenuLink>
          <MenuLink href="/trips" icon={Briefcase} onClick={() => setOpen(false)}>
            Trips
          </MenuLink>

          {!premium && (
            <MenuLink href="/profile/upgrade" icon={Sparkles} className="text-ember" onClick={() => setOpen(false)}>
              Upgrade to Premium
            </MenuLink>
          )}

          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" /> {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  className,
  onClick,
  children,
}: {
  href: string;
  icon: ElementType;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-surface-sunken transition-colors",
        className
      )}
    >
      <Icon className="h-4 w-4 text-foreground-muted" /> {children}
    </Link>
  );
}
