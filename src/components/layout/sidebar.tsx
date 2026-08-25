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
                active ? "bg-[var(--ember-soft)] text-[var(--ember-strong)]" : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {!premium && (
        <div className="mt-6 rounded-[var(--radius-lg)] bg-[linear-gradient(160deg,var(--forest-soft),var(--surface))] border border-border p-4">
          <Sparkles className="h-5 w-5 text-forest mb-2" />
          <p className="text-sm font-semibold text-foreground">Go Premium</p>
          <p className="text-xs text-foreground-muted mt-1 mb-3">
            Unlimited Surprise Me, AI trip planning, and exclusive experiences.
          </p>
          <Button asChild size="sm" variant="forest" className="w-full">
            <Link href="/profile/upgrade">Upgrade</Link>
          </Button>
        </div>
      )}
    </aside>
  );
}
