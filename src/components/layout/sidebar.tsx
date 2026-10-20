"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { nav } from "@/lib/config/brand";
import { NAV_ICONS } from "./icons";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function Sidebar({ premium }: { premium: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 border-r border-border bg-surface px-4 py-6 h-screen sticky top-0">
      <div className="px-2 mb-8">
        <Logo href="/home" />
      </div>

      <nav className="flex-1 space-y-1">
        {nav.primary.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-colors",
                active ? "bg-[var(--primary-soft)] text-[var(--primary-strong)]" : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}

        {/* The planners, one step back from the lists. */}
        <div className="mt-4 border-t border-border pt-4">
          {nav.secondary.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-colors",
                  active ? "bg-[var(--primary-soft)] font-medium text-[var(--primary-strong)]" : "text-foreground-subtle hover:bg-surface-sunken hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {!premium && (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-border bg-surface-sunken p-4">
          <span className="ring-brand mb-3 inline-block">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
          </span>
          <p className="text-sm font-semibold text-foreground">Go Premium</p>
          <p className="text-xs text-foreground-muted mt-1 mb-3">
            Unlimited Surprise Me, more specific categories in Discover, and AI trip planning.
          </p>
          <Button asChild size="sm" className="w-full">
            <Link href="/profile/upgrade">Upgrade</Link>
          </Button>
        </div>
      )}
    </aside>
  );
}
